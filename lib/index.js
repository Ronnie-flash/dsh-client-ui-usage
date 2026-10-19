import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { zstdDecompressSync } from "node:zlib";

/**
 * dsh-client-ui-usage host half.
 *
 * 1) /usage-balance  —— DeepSeek 余额只读代理（API key 不出主进程）。
 * 2) /usage-stats    —— 本地会话日志扫描 + 增量索引，供「用量统计」页使用。
 *
 * 扫描口径（与 usage-panel-spec.md 一致）：
 *   - 只统计 `assistant/message` 的 usage，绝不累加 assistant/chunk 之类的流式分片；
 *   - Token 总量 = inputTokens + outputTokens，cacheReadTokens 单列；
 *   - 日期/小时桶一律按本地时区（Asia/Shanghai）计算；
 *   - delegationDepth > 0 视为子代理会话，单独标记，卡片默认剔除。
 */
const name = "client-ui-usage";
const inject = ["webServer"];

const BALANCE_API = "https://api.deepseek.com/user/balance";

async function readApiKey() {
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY.trim() || null;
  try {
    const home = process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
    const raw = await readFile(path.join(home, ".credentials.yaml"), "utf8");
    const m = raw.match(/DEEPSEEK_API_KEY\s*:\s*"?([^"\r\n]+)"?/);
    if (m) return m[1].trim() || null;
  } catch {
    /* file missing or unreadable -> no key */
  }
  return null;
}

//#region 会话扫描
/**
 * 解 zstd：DSH 是「一条事件一帧」追加写入的，一个文件里往往是多个 frame 首尾相接。
 * Node 的 zstdDecompressSync / 流式解压都只处理第一帧，所以这里按 frame magic 切开逐帧解；
 * 万一压缩数据里恰好出现 magic，逐帧解会失败，就把这段并到下一帧重试。
 */
const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

function decodeZstd(buf) {
  const offsets = [];
  let at = 0;
  while ((at = buf.indexOf(ZSTD_MAGIC, at)) !== -1) {
    offsets.push(at);
    at += 4;
  }
  if (offsets.length === 0) return zstdDecompressSync(buf);
  if (offsets[0] !== 0) offsets.unshift(0);

  const parts = [];
  let i = 0;
  while (i < offsets.length) {
    let j = i + 1;
    let decoded = null;
    while (decoded === null) {
      const end = j < offsets.length ? offsets[j] : buf.length;
      try {
        decoded = zstdDecompressSync(buf.subarray(offsets[i], end));
      } catch {
        if (j >= offsets.length) throw new Error("zstd frame decode failed");
        j += 1;
      }
    }
    parts.push(decoded);
    i = j;
  }
  return Buffer.concat(parts);
}

/** 文件级索引缓存：path -> { mtimeMs, size, rec }。mtime/size 没变就跳过解析。 */
const SESSION_CACHE = new Map();

/**
 * 磁盘索引缓存。107MB 压缩日志首次解压要 7 秒，进程重启后不该再付一次。
 * 缓存只存聚合结果（不含对话正文），落在 <DSH_HOME>/.cache/usage-stats.json。
 */
const CACHE_VERSION = 2;
let diskCacheLoaded = false;

function cacheFile(home) {
  return path.join(home, ".cache", "usage-stats.json");
}

async function loadDiskCache(home) {
  if (diskCacheLoaded) return;
  diskCacheLoaded = true;
  try {
    const parsed = JSON.parse(await readFile(cacheFile(home), "utf8"));
    if (!parsed || parsed.version !== CACHE_VERSION) return;
    for (const [file, entry] of Object.entries(parsed.files || {})) {
      if (entry && typeof entry.mtimeMs === "number") SESSION_CACHE.set(file, entry);
    }
  } catch {
    /* 首次运行或缓存损坏 -> 全量扫描 */
  }
}

async function saveDiskCache(home) {
  try {
    const files = Object.create(null);
    for (const [file, entry] of SESSION_CACHE) files[file] = entry;
    await mkdir(path.join(home, ".cache"), { recursive: true });
    await writeFile(cacheFile(home), JSON.stringify({ version: CACHE_VERSION, savedAt: Date.now(), files }));
  } catch {
    /* 缓存写失败不影响主流程 */
  }
}
/** 上一次完整扫描的结果，直接复用给并发请求。 */
let scanState = { at: 0, ms: 0, root: null, payload: null };
let scanning = null;

/**
 * 候选 sessions 目录（按发现顺序，pickRoot 再按活跃度择优）。
 * 不写死任何绝对路径：优先 DSH_HOME，其次从进程参数/工作目录推断，最后回退到 ~/.dsh。
 */
function candidateRoots() {
  const out = [];
  const add = (value) => {
    if (value) out.push(value);
  };

  add(process.env.DSH_SESSIONS_DIR);
  if (process.env.DSH_HOME) add(path.join(process.env.DSH_HOME, "sessions"));

  // 桌面端启动时会把 profile 目录作为参数传给宿主，形如 <home>/profiles/<name>。
  for (const arg of process.argv) {
    if (typeof arg === "string" && /[\\/]profiles[\\/][^\\/]+$/.test(arg)) {
      add(path.join(path.dirname(path.dirname(arg)), "sessions"));
    }
  }

  // 从工作目录逐级向上找 .dsh。
  let cursor = process.cwd();
  for (let depth = 0; depth < 6; depth++) {
    add(path.join(cursor, ".dsh", "sessions"));
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }

  add(path.join(os.homedir(), ".dsh", "sessions"));
  return [...new Set(out)];
}

/** 选一个存在的 sessions 根；多个存在时取子目录最新修改的那个。 */
async function pickRoot() {
  let best = null;
  for (const dir of candidateRoots()) {
    try {
      const st = await stat(dir);
      if (!st.isDirectory()) continue;
      const children = await readdir(dir, { withFileTypes: true }).catch(() => []);
      let newest = st.mtimeMs;
      for (const child of children) {
        if (!child.isDirectory()) continue;
        const cst = await stat(path.join(dir, child.name)).catch(() => null);
        if (cst && cst.mtimeMs > newest) newest = cst.mtimeMs;
      }
      if (!best || newest > best.newest) best = { dir, newest };
    } catch {
      /* 不存在就跳过 */
    }
  }
  return best ? best.dir : null;
}

function localDateKey(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 解析单个 session 文件，返回聚合记录。
 *
 * 性能取舍：一行 assistant/message 可能带几十 KB 的正文，整行 JSON.parse 很贵。
 * 这里用正则只抠需要的字段（`"usage":{...}` / `"source":{...}` / `"time"`），
 * 内容里的引号都是转义过的，不会误命中这几个键。
 */
const RE_TIME = /"time":(\d+)/;
const RE_USAGE = /"usage":\{([^}]*)\}/;
const RE_SOURCE = /"source":\{([^}]*)\}/;
const RE_PROVIDER = /"provider":"([^"]*)"/;
const RE_MODEL = /"model":"([^"]*)"/;
const RE_CREATED = /"createdAt":(\d+)/;
const RE_DEPTH = /"delegationDepth":(\d+)/;
const RE_ID = /"id":"(session-[^"]+)"/;
const RE_CWD = /"cwd":"((?:[^"\\]|\\.)*)"/;

function numField(body, key) {
  const m = new RegExp(`"${key}":(\\d+)`).exec(body);
  return m ? Number(m[1]) : 0;
}

function parseSession(text, fallbackMs) {
  const rec = {
    id: null,
    createdAt: fallbackMs,
    depth: 0,
    cwd: "",
    total: 0,
    input: 0,
    output: 0,
    cache: 0,
    messages: 0,
    models: Object.create(null),
    hours: Object.create(null),
    days: Object.create(null),
    lastUsed: 0,
  };

  const lines = text.split("\n");
  for (const line of lines) {
    if (!line) continue;
    if (line.indexOf('"type":"assistant/message"') === -1 &&
        line.indexOf('"type":"user/message"') === -1 &&
        line.indexOf('"type":"session"') === -1) continue;

    if (line.indexOf('"type":"session"') !== -1) {
      const id = RE_ID.exec(line);
      const created = RE_CREATED.exec(line);
      const depth = RE_DEPTH.exec(line);
      const cwd = RE_CWD.exec(line);
      if (id) rec.id = id[1];
      if (created) rec.createdAt = Number(created[1]);
      if (depth) rec.depth = Number(depth[1]);
      if (cwd) {
        try { rec.cwd = JSON.parse(`"${cwd[1]}"`); } catch { rec.cwd = cwd[1]; }
      }
      continue;
    }

    if (line.indexOf('"type":"user/message"') !== -1) {
      rec.messages += 1;
      continue;
    }

    // assistant/message
    rec.messages += 1;
    const timeMatch = RE_TIME.exec(line);
    const time = timeMatch ? Number(timeMatch[1]) : rec.createdAt;
    if (time > rec.lastUsed) rec.lastUsed = time;

    const usage = RE_USAGE.exec(line);
    if (!usage) continue;
    const body = usage[1];
    const input = numField(body, "inputTokens");
    const output = numField(body, "outputTokens");
    const cache = numField(body, "cacheReadTokens");
    const tok = input + output; // 缓存读取单列，不计入总量

    rec.input += input;
    rec.output += output;
    rec.cache += cache;
    rec.total += tok;

    let key = "unknown";
    const source = RE_SOURCE.exec(line);
    if (source) {
      const provider = RE_PROVIDER.exec(source[1]);
      const model = RE_MODEL.exec(source[1]);
      if (model) key = provider ? `${provider[1]}/${model[1]}` : model[1];
    }

    const m = rec.models[key] || (rec.models[key] = { total: 0, input: 0, output: 0, cache: 0, calls: 0, last: 0 });
    m.total += tok;
    m.input += input;
    m.output += output;
    m.cache += cache;
    m.calls += 1;
    if (time > m.last) m.last = time;

    const when = new Date(time);
    const day = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`;
    rec.days[day] = (rec.days[day] || 0) + tok;
    const hour = String(when.getHours());
    rec.hours[hour] = (rec.hours[hour] || 0) + tok;
  }

  return rec;
}

async function listSessionFiles(root) {
  const files = [];
  // 一个会话目录里可能同时存在多种落盘格式；取最新的那一份（.full 可能是导出快照）。
  const CANDIDATES = ["session.full.jsonl", "session.jsonl", "session.jsonl.zstd", "session.jsonl.zstd.jsonl"];
  const cwdDirs = await readdir(root, { withFileTypes: true }).catch(() => []);
  for (const cwdDir of cwdDirs) {
    if (!cwdDir.isDirectory()) continue;
    const cwdPath = path.join(root, cwdDir.name);
    const sessions = await readdir(cwdPath, { withFileTypes: true }).catch(() => []);
    for (const s of sessions) {
      if (!s.isDirectory()) continue;
      const dir = path.join(cwdPath, s.name);
      let best = null;
      for (const name of CANDIDATES) {
        const file = path.join(dir, name);
        const st = await stat(file).catch(() => null);
        if (!st || !st.isFile()) continue;
        if (!best || st.mtimeMs > best.mtimeMs) best = { file, mtimeMs: st.mtimeMs };
      }
      if (best) files.push({ dir, file: best.file });
    }
  }
  return files;
}

async function scanSessions(force) {
  const now = Date.now();
  if (!force && scanState.payload && now - scanState.at < 15000) return scanState.payload;
  if (scanning) return scanning;

  scanning = (async () => {
    const started = Date.now();
    const root = await pickRoot();
    if (!root) {
      scanState = { at: Date.now(), ms: 0, root: null, payload: emptyPayload(null, 0) };
      scanning = null;
      return scanState.payload;
    }

    const home = path.dirname(root);
    await loadDiskCache(home);

    const entries = await listSessionFiles(root);
    const seen = new Set();
    const sessions = [];
    let dirty = false;

    // 并发解析：读盘 + 解压 + 扫描都是重活，串行跑满 8 秒，开 6 个 worker 压到 2 秒级。
    const CONCURRENCY = 6;
    let cursor = 0;
    const worker = async () => {
      for (;;) {
        const index = cursor++;
        if (index >= entries.length) return;
        const entry = entries[index];
        let st;
        try {
          st = await stat(entry.file);
        } catch {
          continue; // 文件刚好被删
        }
        seen.add(entry.file);
        let rec = SESSION_CACHE.get(entry.file);
        if (!rec || rec.mtimeMs !== st.mtimeMs || rec.size !== st.size) {
          try {
            const raw = await readFile(entry.file);
            const text = entry.file.endsWith(".zstd") ? decodeZstd(raw).toString("utf8") : raw.toString("utf8");
            rec = { mtimeMs: st.mtimeMs, size: st.size, rec: parseSession(text, st.mtimeMs) };
            SESSION_CACHE.set(entry.file, rec);
            dirty = true;
          } catch {
            continue;
          }
        }
        rec.rec.file = entry.file;
        if (!rec.rec.cwd) rec.rec.cwd = readCwdFromDirName(path.basename(path.dirname(entry.dir)));
        sessions.push(rec.rec);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length || 1) }, worker));

    // 删掉的会话要从缓存里清出去
    for (const key of SESSION_CACHE.keys()) {
      if (!seen.has(key)) {
        SESSION_CACHE.delete(key);
        dirty = true;
      }
    }

    const payload = buildPayload(root, sessions, Date.now() - started);
    scanState = { at: Date.now(), ms: payload.scanMs, root, payload, loadedFromDisk: !dirty };
    if (dirty) void saveDiskCache(home);
    scanning = null;
    return payload;
  })().catch((error) => {
    scanning = null;
    const failed = { ...emptyPayload(null, Date.now() - scanState.at), ok: false, error: String(error?.message ?? error) };
    return failed;
  });

  return scanning;
}

/** 目录名 `--D-work-project--` -> `D:\work\project`，仅作会话头缺 cwd 时的兜底展示。 */
function readCwdFromDirName(name) {
  if (!name) return "";
  const m = /^--([A-Za-z])-(.*)--$/.exec(name);
  if (!m) return name.replace(/^-+|-+$/g, "");
  return `${m[1]}:\\${m[2].split("-").join("\\")}`;
}

function emptyPayload(root, scanMs) {
  return {
    ok: true,
    root,
    scanMs,
    generatedAt: Date.now(),
    sessions: [],
    days: {},
    totals: { sessions: 0, messages: 0, total: 0, input: 0, output: 0, cache: 0 },
    models: [],
    hours: {},
    activeDays: 0,
    subagentSessions: 0,
  };
}

function buildPayload(root, sessions, scanMs) {
  const payload = emptyPayload(root, scanMs);
  const days = Object.create(null);
  const hours = Object.create(null);
  const models = Object.create(null);
  let subagents = 0;

  for (const s of sessions) {
    if (s.depth > 0) subagents += 1;
    payload.totals.sessions += 1;
    payload.totals.messages += s.messages;
    payload.totals.total += s.total;
    payload.totals.input += s.input;
    payload.totals.output += s.output;
    payload.totals.cache += s.cache;

    for (const [day, tok] of Object.entries(s.days)) {
      const bucket = days[day] || (days[day] = { tokens: 0, messages: 0, sessions: 0 });
      bucket.tokens += tok;
      bucket.sessions += 1;
    }
    for (const [hour, tok] of Object.entries(s.hours)) hours[hour] = (hours[hour] || 0) + tok;
    for (const [model, m] of Object.entries(s.models)) {
      const bucket = models[model] || (models[model] = { model, total: 0, input: 0, output: 0, cache: 0, calls: 0, last: 0, sessions: 0 });
      bucket.total += m.total;
      bucket.input += m.input;
      bucket.output += m.output;
      bucket.cache += m.cache;
      bucket.calls += m.calls;
      bucket.sessions += 1;
      if (m.last > bucket.last) bucket.last = m.last;
    }
  }

  payload.days = days;
  payload.hours = hours;
  payload.activeDays = Object.keys(days).filter((d) => (days[d].tokens || 0) > 0).length;
  payload.subagentSessions = subagents;
  payload.models = Object.values(models).sort((a, b) => b.total - a.total);
  payload.sessions = sessions.map((s) => ({
    id: s.id,
    c: s.createdAt,
    d: s.depth,
    t: s.total,
    i: s.input,
    o: s.output,
    k: s.cache,
    m: s.messages,
    last: s.lastUsed,
    cwd: s.cwd,
    mo: Object.fromEntries(Object.entries(s.models).map(([k, v]) => [k, [v.total, v.input, v.output, v.cache, v.calls]])),
    hr: Object.entries(s.hours).map(([h, t]) => [Number(h), t]),
  }));
  return payload;
}
//#endregion

/** GET /usage-balance -> { ok: true, is_available, balance_infos } | { ok: false, error, detail? } */
function apply(ctx) {
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: "prefix",
        path: "/usage-balance",
        handler: async (req, res) => {
          if (req.method !== "GET" && req.method !== "HEAD") {
            res.writeHead(405, { "content-type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "method-not-allowed" }));
            return;
          }
          res.writeHead(200, {
            "content-type": "application/json",
            "cache-control": "no-store",
          });
          try {
            const key = await readApiKey();
            if (!key) {
              res.end(JSON.stringify({ ok: false, error: "no-api-key" }));
              return;
            }
            const r = await fetch(BALANCE_API, {
              headers: { authorization: `Bearer ${key}` },
              signal: AbortSignal.timeout(10000),
            });
            const json = await r.json().catch(() => null);
            if (!r.ok) {
              res.end(JSON.stringify({
                ok: false,
                error: `HTTP ${r.status}`,
                detail: json?.error?.message ?? null,
              }));
              return;
            }
            res.end(JSON.stringify({ ok: true, ...(json ?? {}) }));
          } catch (e) {
            res.end(JSON.stringify({ ok: false, error: String(e?.message ?? e) }));
          }
        },
      }),
    "client-ui-usage: balance proxy route",
  );

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: "prefix",
        path: "/usage-stats",
        handler: async (req, res) => {
          if (req.method !== "GET" && req.method !== "HEAD") {
            res.writeHead(405, { "content-type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "method-not-allowed" }));
            return;
          }
          res.writeHead(200, {
            "content-type": "application/json",
            "cache-control": "no-store",
          });
          try {
            const url = new URL(req.url ?? "/", "http://local");
            const force = url.searchParams.get("refresh") === "1";
            const payload = await scanSessions(force);
            res.end(JSON.stringify(payload));
          } catch (error) {
            res.end(JSON.stringify({ ok: false, error: String(error?.message ?? error) }));
          }
        },
      }),
    "client-ui-usage: session usage stats route",
  );
}

export { apply, inject, name };
