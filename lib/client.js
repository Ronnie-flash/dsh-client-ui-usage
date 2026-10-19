window.__ModuleLoader__.load({
	id: "dsh-client-ui-usage",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		let react = require("react");

		/**
		 * dsh-client-ui-usage client half: a "Usage" action in the conversation
		 * session header (top of the chat column). Clicking it fetches the
		 * same-origin balance proxy (/usage-balance, host half) and shows a small
		 * panel with the DeepSeek account balance, plus a link to the full usage
		 * page on platform.deepseek.com.
		 */

		// ---- styles (theme tokens, consistent with the jobs/skin plugins) ----
		const tagId = "dsh-client-ui-usage/style.css";
		const css = [
			".dsu-root{position:relative;display:inline-flex}",
			".dsu-trigger{min-height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:transparent;border:0;border-radius:6px;align-items:center;gap:3px;padding:3px 6px;font-size:12px;line-height:18px;display:inline-flex}",
			".dsu-trigger:hover,.dsu-trigger:focus-visible{color:var(--dsw-alias-label-secondary)}",
			".dsu-panel{z-index:1000;box-sizing:border-box;width:min(920px,calc(100vw - 32px));max-height:calc(100vh - 96px);overflow:auto;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-menu);box-shadow:var(--dsw-shadow-lv3);border-radius:14px;padding:12px 14px;position:fixed;top:56px;right:16px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:10px}",
			".dsu-panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px}",
			".dsu-panel-tabs{display:flex;gap:2px;padding:3px;border-radius:9px;background:rgba(127,127,127,.10)}",
			".dsu-tab{padding:4px 12px;border:0;border-radius:7px;background:transparent;color:inherit;cursor:pointer;font-size:12px;opacity:.65}",
			".dsu-tab:hover{opacity:1}",
			".dsu-tab[data-active='true']{background:rgba(127,127,127,.22);opacity:1;font-weight:600}",
			".dsu-close{border:0;background:transparent;color:inherit;cursor:pointer;font-size:14px;opacity:.55;padding:2px 6px;border-radius:6px}",
			".dsu-close:hover{opacity:1;background:rgba(127,127,127,.15)}",
			".dsu-panel-body{min-height:0}",
			".dsu-balance{display:flex;flex-direction:column;gap:6px}",
			".dsu-title{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary)}",
			".dsu-row{display:flex;justify-content:space-between;gap:8px;align-items:baseline}",
			".dsu-row b{font-variant-numeric:tabular-nums;font-weight:600}",
			".dsu-status-ok{color:var(--dsw-alias-brand-primary,#0d9488)}",
			".dsu-status-bad{color:#dc2626}",
			".dsu-low{color:#dc2626!important;font-weight:700}",
			".dsu-low-flag{margin-left:4px}",
			".dsu-err{color:#dc2626;font-size:12px;line-height:18px}",
			".dsu-muted{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px}",
			".dsu-link{margin-top:2px;padding:8px 0 0;border:0;border-top:1px solid var(--dsw-alias-border-l1);background:none;color:var(--dsw-alias-brand-primary,#0d9488);cursor:pointer;font-size:12px;text-align:left}",
			".dsu-link:hover{text-decoration:underline}",
			// ---- 用量统计页 ----
			".du-root{max-width:980px;margin:0 auto;display:flex;flex-direction:column;gap:14px;font-size:13px;line-height:1.5}",
			".du-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}",
			".du-title{font-size:16px;font-weight:600;letter-spacing:.01em}",
			".du-muted{color:var(--dsw-alias-label-tertiary);font-size:12px}",
			".du-error{color:#dc2626}",
			".du-btn{padding:5px 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:inherit;cursor:pointer;font-size:12px}",
			".du-btn:hover{background:rgba(127,127,127,.12)}",
			".du-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}",
			".du-tabs{display:flex;gap:2px;padding:3px;border-radius:9px;background:rgba(127,127,127,.10)}",
			".du-tab{padding:4px 12px;border:0;border-radius:7px;background:transparent;color:inherit;cursor:pointer;font-size:12px;opacity:.65}",
			".du-tab:hover{opacity:1}",
			".du-tab[data-active='true']{background:rgba(127,127,127,.22);opacity:1;font-weight:600}",
			".du-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}",
			".du-card{border:1px solid rgba(127,127,127,.18);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:4px;min-width:0}",
			".du-card-value{font-size:30px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".du-card-label{font-size:12px;color:var(--dsw-alias-label-tertiary)}",
			".du-heat{display:flex;flex-direction:column;gap:8px;border:1px solid rgba(127,127,127,.18);border-radius:12px;padding:16px}",
			".du-heat-title{font-size:13px;font-weight:600}",
			".du-heat-wrap{display:flex;gap:6px;overflow-x:auto;overflow-y:hidden;padding-bottom:2px}",
			".du-heat-days{display:flex;flex-direction:column;gap:3px;width:16px;flex:none}",
			".du-heat-day{height:11px;font-size:10px;line-height:11px;color:var(--dsw-alias-label-tertiary)}",
			".du-heat-grid{display:flex;gap:3px;flex:none}",
			".du-heat-col{display:flex;flex-direction:column;gap:3px;width:11px;flex:none}",
			".du-heat-month{height:14px;font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:visible}",
			".du-cell{width:11px;height:11px;border-radius:2px;background:rgba(127,127,127,.14);display:inline-block;flex:none}",
			".du-cell[data-level='1']{background:rgba(16,163,127,.28)}",
			".du-cell[data-level='2']{background:rgba(16,163,127,.46)}",
			".du-cell[data-level='3']{background:rgba(16,163,127,.70)}",
			".du-cell[data-level='4']{background:rgba(16,163,127,1)}",
			".du-cell[data-dim='1']{opacity:.35}",
			".du-cell:focus-visible{outline:2px solid rgba(16,163,127,.8);outline-offset:1px}",
			".du-legend{display:flex;align-items:center;gap:4px;justify-content:flex-end;font-size:11px;color:var(--dsw-alias-label-tertiary)}",
			".du-egg{font-size:12px;color:var(--dsw-alias-label-tertiary)}",
			".du-models{display:flex;flex-direction:column;gap:14px}",
			".du-model-row{display:flex;flex-direction:column;gap:5px}",
			".du-model-head{display:flex;justify-content:space-between;gap:10px;font-size:12px}",
			".du-model-name{font-weight:600}",
			".du-model-total{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary)}",
			".du-bar{height:6px;border-radius:3px;background:rgba(127,127,127,.18);overflow:hidden}",
			".du-bar i{display:block;height:100%;border-radius:3px;background:rgba(16,163,127,.85)}",
			".du-model-meta{font-size:11px;color:var(--dsw-alias-label-tertiary)}",
			"@media (max-width:720px){.du-cards{grid-template-columns:repeat(2,1fr)}}",
		].join("\n");

		function injectStyle() {
			if (typeof document === "undefined") return;
			if (document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-client-ui-usage";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		injectStyle();

		const USAGE_URL = "https://platform.deepseek.com/usage";
		/** Required services: the slot registry (provided by the client runtime). */
		const inject = ["slots"];

		/**
		 * Session cost estimation (yuan per million tokens).
		 * DeepSeek changed pricing on 2026-08-17 (Beijing) to peak/off-peak:
		 * peak hours 09:00-12:00 and 14:00-18:00; off-peak is half price.
		 * Before that date the legacy flat price applies. `legacy` prices are
		 * the pre-2026-08-17 rates; switch `DEFAULT_MODEL_ID` for Pro.
		 */
		const PRICING = {
			"deepseek-v4-flash": {
				legacy: { hit: 0.02, miss: 1.0, out: 2.0 },
				peak: { hit: 0.10, miss: 3.0, out: 9.0 },
				off: { hit: 0.05, miss: 1.5, out: 4.5 },
			},
			"deepseek-v4-pro": {
				legacy: { hit: 0.025, miss: 3.0, out: 6.0 },
				peak: { hit: 0.30, miss: 9.0, out: 27.0 },
				off: { hit: 0.15, miss: 4.5, out: 13.5 },
			},
		};
		/** New peak/off-peak pricing takes effect at 2026-08-17 00:00 Beijing time. */
		const NEW_PRICE_EFFECTIVE = new Date("2026-08-17T00:00:00+08:00");
		/** Which model to price against. Change this id to switch (e.g. "deepseek-v4-pro"). */
		const DEFAULT_MODEL_ID = "deepseek-v4-flash";

		/** Current hour in the Asia/Shanghai timezone, falling back to local time. */
		function beijingHour() {
			try {
				const s = new Intl.DateTimeFormat("en-US", {
					timeZone: "Asia/Shanghai",
					hour: "2-digit",
					hour12: false,
				}).format(new Date());
				return parseInt(s, 10) % 24;
			} catch {
				return new Date().getHours();
			}
		}

		function isPeakHour() {
			const h = beijingHour();
			return (h >= 9 && h < 12) || (h >= 14 && h < 18);
		}

		/** Resolve the active price set for the default model: legacy | peak | off. */
		function priceFor(modelId) {
			const model = PRICING[modelId];
			if (!model) return null;
			if (new Date() < NEW_PRICE_EFFECTIVE) return { ...model.legacy, period: "旧价" };
			return isPeakHour()
				? { ...model.peak, period: "高峰" }
				: { ...model.off, period: "空闲" };
		}

		/** Estimate session cost from the tokenUsage projection; null when unusable. */
		function costOfUsage(usage) {
			if (!usage) return null;
			const p = priceFor(DEFAULT_MODEL_ID);
			if (!p) return null;
			const M = 1e6;
			// DeepSeek bills cache-write tokens at the miss rate (they were not
			// cached on that request); only cache reads get the discounted hit rate.
			const cost =
				((usage.uncachedInputTokens || 0) + (usage.cacheWriteTokens || 0)) / M * p.miss +
				(usage.cacheReadTokens || 0) / M * p.hit +
				(usage.outputTokens || 0) / M * p.out;
			return { cost, modelId: DEFAULT_MODEL_ID, period: p.period };
		}

		/** Cost row for the panel body; null hides it. */
		function costRow(cost) {
			if (!cost || !(cost.cost > 0)) return null;
			return react.createElement("div", { className: "dsu-row" },
				react.createElement("span", null, `会话成本（${cost.modelId}·${cost.period}）`),
				react.createElement("b", null, `≈ ¥${cost.cost.toFixed(4)}`),
			);
		}

		/** 余额低于这个值就标红并加 ❗（单位同 API 返回的币种）。 */
		const LOW_BALANCE_THRESHOLD = 0.5;

		/** Balance row renderers, plain so the panel body stays readable. */
		function balanceRows(data) {
			const out = [];
			out.push(
				react.createElement("div", { className: "dsu-row" },
					react.createElement("span", null, "账户状态"),
					react.createElement("b", {
						className: data.is_available === false ? "dsu-status-bad" : "dsu-status-ok",
					}, data.is_available === false ? "不可用" : "可用"),
				),
			);
			const infos = Array.isArray(data.balance_infos) ? data.balance_infos : [];
			if (infos.length === 0) {
				out.push(react.createElement("div", { className: "dsu-muted" }, "(无余额信息)"));
			}
			for (const b of infos) {
				const raw = b.total_balance;
				const num = typeof raw === "number" ? raw : parseFloat(raw);
				const low = Number.isFinite(num) && num < LOW_BALANCE_THRESHOLD;
				const amount = raw ?? "?";
				out.push(
					react.createElement("div", { className: "dsu-row" },
						react.createElement("span", { className: low ? "dsu-low" : undefined }, `余额 (${b.currency ?? "?"})`),
						react.createElement("b", {
							className: low ? "dsu-low" : undefined,
							title: low ? `余额低于 ${LOW_BALANCE_THRESHOLD}，请及时充值` : undefined,
						},
							amount,
							low ? react.createElement("span", { className: "dsu-low-flag" }, "❗") : null,
						),
					),
					react.createElement("div", { className: "dsu-muted" },
						`充值 ${b.topped_up_balance ?? "?"} · 赠送 ${b.granted_balance ?? "?"}`),
				);
			}
			out.push(react.createElement("div", { className: "dsu-muted" },
				"刷新 " + new Date().toLocaleString()));
			return out;
		}

		function UsageButton({ useProjection }) {
			const usage = useProjection ? useProjection("tokenUsage") : void 0;
			const [open, setOpen] = react.useState(false);
			const [tab, setTab] = react.useState("balance");
			const [state, setState] = react.useState({ loading: false, data: null, error: null });

			const load = react.useCallback(() => {
				setState((s) => ({ ...s, loading: true, error: null }));
				fetch("/usage-balance", { signal: AbortSignal.timeout(12000) })
					.then((r) => r.json())
					.then((j) => {
						if (!j || j.ok !== true) {
							const msg = j?.error === "no-api-key"
								? "未找到 DEEPSEEK_API_KEY（~/.dsh/.credentials.yaml 或环境变量）"
								: (j?.detail || j?.error || "请求失败");
							throw new Error(msg);
						}
						setState({ loading: false, data: j, error: null });
					})
					.catch((e) => setState({ loading: false, data: null, error: e?.message ?? String(e) }));
			}, []);

			// outside click + Esc close
			react.useEffect(() => {
				if (!open) return;
				const onDown = (ev) => {
					const el = ev?.target;
					if (el && el.closest && !el.closest("[data-dsu-root]")) setOpen(false);
				};
				const onKey = (ev) => { if (ev?.key === "Escape") setOpen(false); };
				document.addEventListener("mousedown", onDown);
				document.addEventListener("keydown", onKey);
				return () => {
					document.removeEventListener("mousedown", onDown);
					document.removeEventListener("keydown", onKey);
				};
			}, [open]);

			const toggle = () => {
				const next = !open;
				setOpen(next);
				if (next && tab === "balance" && !state.data) load();
			};

			const switchTab = (next) => {
				setTab(next);
				if (next === "balance" && !state.data && !state.loading) load();
			};

			let body = null;
			if (tab === "stats") {
				body = react.createElement("div", { className: "dsu-stats" }, react.createElement(UsageSection));
			} else if (state.loading) {
				body = react.createElement("div", { className: "dsu-muted" }, "加载中…");
			} else if (state.error) {
				body = react.createElement("div", { className: "dsu-err" }, state.error);
			} else if (state.data) {
				const rows = balanceRows(state.data);
				const cost = costRow(costOfUsage(usage));
				if (cost) rows.push(cost);
				body = react.createElement("div", { className: "dsu-balance" }, rows);
			}

			const tabs = [["balance", "余额"], ["stats", "用量统计"]].map(([key, label]) =>
				react.createElement("button", {
					key,
					type: "button",
					className: "dsu-tab",
					"data-active": String(tab === key),
					onClick: () => switchTab(key),
				}, label));

			const panel = open
				? react.createElement("div", { className: "dsu-panel" },
					react.createElement("div", { className: "dsu-panel-head" },
						react.createElement("div", { className: "dsu-panel-tabs" }, tabs),
						react.createElement("button", {
							type: "button",
							className: "dsu-close",
							title: "关闭",
							onClick: () => setOpen(false),
						}, "✕")),
					react.createElement("div", { className: "dsu-panel-body" }, body),
					tab === "balance"
						? react.createElement("button", {
							type: "button",
							className: "dsu-link",
							onClick: () => window.open(USAGE_URL, "_blank", "noopener"),
						}, "打开完整用量页 ↗")
						: null,
				)
				: null;

			return react.createElement("div", { className: "dsu-root", "data-dsu-root": "true" },
				react.createElement("button", {
					type: "button",
					className: "dsu-trigger",
					"aria-expanded": open,
					title: "DeepSeek 账户用量",
					onClick: toggle,
				}, "Usage"),
				panel,
			);
		}

		// ================= 用量统计（Usage 面板内「用量统计」tab） =================

		/** 《了不起的盖茨比》单本 token 估算值（与 Claude 的口径一致，可调）。 */
		const BOOK_TOKENS = 66000;

		function fmtInt(n) {
			return (n || 0).toLocaleString("en-US");
		}

		function fmtCompact(n) {
			if (!n) return "0";
			if (n >= 1e8) return (n / 1e8).toFixed(2) + " 亿";
			if (n >= 1e4) return (n / 1e4).toFixed(1) + " 万";
			if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
			return String(n);
		}

		function startOfDay(ms) {
			const d = new Date(ms);
			d.setHours(0, 0, 0, 0);
			return d.getTime();
		}

		function dayKey(date) {
			const y = date.getFullYear();
			const m = String(date.getMonth() + 1).padStart(2, "0");
			const d = String(date.getDate()).padStart(2, "0");
			return `${y}-${m}-${d}`;
		}

		/** 范围起点：全部 / 近 30 天 / 近 7 天（含今天）。 */
		function rangeStart(range) {
			if (range === "30d") return startOfDay(Date.now()) - 29 * 864e5;
			if (range === "7d") return startOfDay(Date.now()) - 6 * 864e5;
			return 0;
		}

		function hourLabel(hour) {
			const part = hour < 12 ? "上午" : hour < 18 ? "下午" : "晚上";
			const h12 = hour % 12 === 0 ? 12 : hour % 12;
			return `${part} ${h12} 点`;
		}

		function shortModel(id) {
			return String(id || "").split("/").pop();
		}

		/** 汇总指定范围的数据；子代理会话（delegationDepth>0）不计入卡片。 */
		function summarizeRange(data, range) {
			const since = rangeStart(range);
			const sessions = (data.sessions || []).filter((s) => s.c >= since);
			const main = sessions.filter((s) => !(s.d > 0));
			const out = {
				sessions: main.length,
				subagents: sessions.length - main.length,
				messages: 0,
				total: 0,
				input: 0,
				output: 0,
				cache: 0,
				hours: {},
				models: new Map(),
			};
			for (const s of main) {
				out.messages += s.m || 0;
				out.total += s.t || 0;
				out.input += s.i || 0;
				out.output += s.o || 0;
				out.cache += s.k || 0;
				for (const pair of s.hr || []) out.hours[pair[0]] = (out.hours[pair[0]] || 0) + pair[1];
				for (const [name, v] of Object.entries(s.mo || {})) {
					const bucket = out.models.get(name) || { model: name, total: 0, input: 0, output: 0, cache: 0, calls: 0, sessions: 0 };
					bucket.total += v[0] || 0;
					bucket.input += v[1] || 0;
					bucket.output += v[2] || 0;
					bucket.cache += v[3] || 0;
					bucket.calls += v[4] || 0;
					bucket.sessions += 1;
					out.models.set(name, bucket);
				}
			}

			const days = data.days || {};
			let activeDays = 0;
			for (const [key, v] of Object.entries(days)) {
				if ((v.tokens || 0) <= 0) continue;
				const ms = new Date(`${key}T00:00:00`).getTime();
				if (ms >= since) activeDays += 1;
			}
			out.activeDays = activeDays;

			let peak = null;
			for (const [hour, tokens] of Object.entries(out.hours)) {
				if (!peak || tokens > peak.tokens) peak = { hour: Number(hour), tokens };
			}
			out.peak = peak;
			out.modelList = [...out.models.values()].sort((a, b) => b.total - a.total);
			out.topModel = out.modelList[0] || null;
			return out;
		}

		/** 53 列 × 7 行热力图；周一起始，最后一列是本周。 */
		function buildHeatmap(days) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const weekday = (today.getDay() + 6) % 7;
			const end = new Date(today.getTime() + (6 - weekday) * 864e5);
			const start = new Date(end.getTime() - (53 * 7 - 1) * 864e5);

			const columns = [];
			const months = [];
			const values = [];
			let cursor = new Date(start);
			for (let w = 0; w < 53; w++) {
				const col = [];
				for (let d = 0; d < 7; d++) {
					const key = dayKey(cursor);
					const bucket = days[key] || {};
					const tokens = bucket.tokens || 0;
					col.push({ key, tokens, sessions: bucket.sessions || 0, future: cursor > today, ms: cursor.getTime() });
					if (cursor <= today && tokens > 0) values.push(tokens);
					cursor = new Date(cursor.getTime() + 864e5);
				}
				columns.push(col);
				months.push(new Date(start.getTime() + w * 7 * 864e5).getMonth());
			}
			values.sort((a, b) => a - b);
			const pick = (q) => (values.length ? values[Math.min(values.length - 1, Math.floor(values.length * q))] : 1);
			return { columns, months, levels: [pick(0.25), pick(0.5), pick(0.75), pick(0.95)] };
		}

		function levelOf(tokens, levels) {
			if (!tokens) return 0;
			if (tokens <= levels[0]) return 1;
			if (tokens <= levels[1]) return 2;
			if (tokens <= levels[2]) return 3;
			return 4;
		}

		function UsageSection() {
			const h = react.createElement;
			const [state, setState] = react.useState({ loading: true, data: null, error: null });
			const [tab, setTab] = react.useState("overview");
			const [range, setRange] = react.useState("all");

			const load = react.useCallback(() => {
				setState((prev) => ({ ...prev, loading: true, error: null }));
				fetch("/usage-stats?refresh=1", { signal: AbortSignal.timeout(120000) })
					.then((r) => r.json())
					.then((json) => {
						if (!json || json.ok !== true) throw new Error((json && json.error) || "统计接口返回异常");
						setState({ loading: false, data: json, error: null });
					})
					.catch((error) => setState({ loading: false, data: null, error: error?.message ?? String(error) }));
			}, []);

			react.useEffect(() => {
				load();
			}, [load]);

			if (state.loading && !state.data) {
				return h("div", { className: "du-root" }, h("div", { className: "du-muted" }, "正在扫描本地会话日志…"));
			}
			if (state.error) {
				return h("div", { className: "du-root" },
					h("div", { className: "du-error" }, "统计失败：" + state.error),
					h("button", { type: "button", className: "du-btn", onClick: load }, "重试"));
			}

			const data = state.data || {};
			const view = summarizeRange(data, range);
			const heat = buildHeatmap(data.days || {});
			const empty = !(data.totals && data.totals.total);
			const since = rangeStart(range);
			const meta = `更新于 ${new Date(data.generatedAt || Date.now()).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} · 扫描 ${data.scanMs || 0} ms`;

			const cards = [
				{ label: "会话数", value: fmtInt(view.sessions), sub: view.subagents > 0 ? `另有 ${view.subagents} 个子代理会话` : "" },
				{ label: "消息数", value: fmtInt(view.messages), sub: "用户 + 助手" },
				{ label: "Token 总量", value: fmtCompact(view.total), sub: view.cache ? `缓存读取 ${fmtCompact(view.cache)}（未计入）` : "" },
				{ label: "活跃天数", value: fmtInt(view.activeDays) + " 天", sub: "" },
				{ label: "高峰时段", value: view.peak ? hourLabel(view.peak.hour) : "—", sub: view.peak ? fmtCompact(view.peak.tokens) + " tokens" : "" },
				{ label: "最常用模型", value: view.topModel ? shortModel(view.topModel.model) : "—", sub: view.topModel ? fmtCompact(view.topModel.total) + " tokens" : "" },
			];

			const tabs = ["overview", "models"].map((key) =>
				h("button", {
					key,
					type: "button",
					className: "du-tab",
					"data-active": String(tab === key),
					onClick: () => setTab(key),
				}, key === "overview" ? "概览" : "模型"));

			const ranges = [["all", "全部"], ["30d", "30 天"], ["7d", "7 天"]].map(([key, label]) =>
				h("button", {
					key,
					type: "button",
					className: "du-tab",
					"data-active": String(range === key),
					onClick: () => setRange(key),
				}, label));

			const monthRow = heat.columns.map((col, index) => {
				const month = heat.months[index];
				const prev = index > 0 ? heat.months[index - 1] : -1;
				return h("div", { key: "m" + index, className: "du-heat-month" },
					index > 0 && month !== prev ? `${month + 1}月` : "");
			});

			const grid = heat.columns.map((col, index) =>
				h("div", { key: "c" + index, className: "du-heat-col" },
					h("div", { key: "m", className: "du-heat-month" },
						index > 0 && heat.months[index] !== heat.months[index - 1] ? `${heat.months[index] + 1}月` : ""),
					col.map((cell) =>
						h("div", {
							key: cell.key,
							className: "du-cell",
							"data-level": String(cell.future ? 0 : levelOf(cell.tokens, heat.levels)),
							"data-dim": String(range !== "all" && cell.ms < since ? "1" : "0"),
							tabIndex: 0,
							title: `${cell.key} · ${fmtCompact(cell.tokens)} tokens · ${cell.sessions} 个会话`,
						}))));

			const legend = h("div", { className: "du-legend" },
				h("span", null, "少"),
				[0, 1, 2, 3, 4].map((lv) => h("i", { key: lv, className: "du-cell", "data-level": String(lv) })),
				h("span", null, "多"));

			const modelRows = view.modelList.map((m) => {
				const share = view.total > 0 ? (m.total / view.total) * 100 : 0;
				return h("div", { key: m.model, className: "du-model-row" },
					h("div", { className: "du-model-head" },
						h("span", { className: "du-model-name" }, shortModel(m.model)),
						h("span", { className: "du-model-total" }, fmtCompact(m.total) + " tokens")),
					h("div", { className: "du-bar" }, h("i", { style: { width: Math.max(1, share).toFixed(1) + "%" } })),
					h("div", { className: "du-model-meta" },
						`输入 ${fmtCompact(m.input)} · 输出 ${fmtCompact(m.output)} · 缓存 ${fmtCompact(m.cache)} · ${m.sessions} 个会话`));
			});

			const body = tab === "overview"
				? [
					h("div", { key: "cards", className: "du-cards" },
						cards.map((card) =>
							h("div", { key: card.label, className: "du-card" },
								h("div", { className: "du-card-value" }, card.value),
								h("div", { className: "du-card-label" }, card.label),
								card.sub ? h("div", { className: "du-muted" }, card.sub) : null))),
					h("div", { key: "heat", className: "du-heat" },
						h("div", { className: "du-heat-title" }, "Token 活动"),
						h("div", { className: "du-heat-wrap" },
							h("div", { className: "du-heat-days" },
								h("div", { className: "du-heat-month" }, ""),
								["一", "", "三", "", "五", "", "日"].map((label, i) => h("div", { key: i, className: "du-heat-day" }, label))),
							h("div", { className: "du-heat-grid" }, grid)),
						legend),
					h("div", { key: "egg", className: "du-egg" },
						`你的 Token 用量相当于 ${fmtInt(Math.round(view.total / BOOK_TOKENS))} 本《了不起的盖茨比》`),
				]
				: [
					h("div", { key: "models", className: "du-models" },
						modelRows.length ? modelRows : h("div", { className: "du-muted" }, "这个范围内还没有用量记录")),
				];

			return h("div", { className: "du-root" },
				h("div", { className: "du-head" },
					h("div", null,
						h("div", { className: "du-title" }, "用量统计"),
						h("div", { className: "du-muted" }, meta + (state.loading ? " · 刷新中…" : ""))),
					h("button", { type: "button", className: "du-btn", onClick: load }, "刷新")),
				empty ? h("div", { className: "du-muted" }, "还没有用量记录，聊两句就有了。") : null,
				h("div", { className: "du-toolbar" },
					h("div", { className: "du-tabs" }, tabs),
					h("div", { className: "du-tabs" }, ranges)),
				body);
		}

		/** Client plugin body: register the header action. */
		function apply(ctx) {
			ctx.slots.inject("conversation.session.header.actions", () =>
				ctx.slots.register({
					name: "conversation.session.header.actions",
					id: "usage",
					order: 30,
					locale: "usage",
				}, UsageButton),
			);
		}

		exports.apply = apply;
		exports.inject = inject;
		// 供离线测试：直接验证余额行与统计聚合（不依赖 React 运行时）。
		exports.__test = { balanceRows, LOW_BALANCE_THRESHOLD, summarizeRange, buildHeatmap, levelOf, rangeStart, BOOK_TOKENS, UsageSection, UsageButton };
		return module.exports;
	},
});
