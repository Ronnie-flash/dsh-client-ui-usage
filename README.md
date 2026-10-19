# dsh-client-ui-usage

DSH（DeepSeek Harness）客户端插件：在会话头部放一个 **Usage** 按钮，点开是一个带两个 tab 的面板。

- **余额** —— 用 DeepSeek API key 直查官方 `GET /user/balance`。密钥只在主进程读取，浏览器只调同源 `/usage-balance`；余额低于 `0.5` 时数字变红并带 ❗。
- **用量统计** —— 扫描本地会话日志：3×2 指标卡 + 53 周 × 7 行 Token 热力图 + 概览/模型双 Tab + 全部 / 30 天 / 7 天范围切换 + 「你的 Token 用量相当于 N 本《了不起的盖茨比》」彩蛋。视觉对齐 Claude 的 Usage 页。

## 安装

### 前置

- DSH 桌面端（在 `0.2.1-rc.2` 上验证）
- Node.js 22+（宿主半用 `zlib.zstdDecompressSync` 解压会话日志）

### 方式 A：patch 层 insert（推荐）

1. 把本仓库放到你的插件目录，例如 `<插件目录>/dsh-client-ui-usage`
2. 编辑 `<DSH_HOME>/profiles/<profile>/package.json`，加上依赖：

   ```json
   "dependencies": {
     "dsh-client-ui-usage": "link:<插件目录>/dsh-client-ui-usage"
   }
   ```

3. 编辑同目录下的 `cordis.patch.yml`：

   ```yaml
   - insert:
       - id: ui-usage
         name: 'dsh-client-ui-usage'
   ```

4. 在该 profile 目录执行 `pnpm install`
5. **重启** DSH

### 方式 B：bundles

在 `dsh.profile.bundles` 里追加 `"dsh-client-ui-usage"`（同时确保 dependencies 里引用了它）。本包自带 `cordis.patch.yml`，列进 bundles 后会自动插入。

> 客户端插件是**进程启动时一次性扫描注册**的：改完必须重启进程，刷新页面不够。

## 配置

余额 tab 需要 `DEEPSEEK_API_KEY`，按顺序查找：

1. 环境变量 `DEEPSEEK_API_KEY`
2. `<DSH_HOME>/.credentials.yaml` 里的 `DEEPSEEK_API_KEY`

没配也能正常用「用量统计」tab，只是余额 tab 会提示未找到 key。

## 数据口径

| 指标 | 口径 |
|---|---|
| 会话数 | 时间范围内的会话数，**剔除子代理会话**（`delegationDepth > 0`），卡片下方标注被剔除数量 |
| 消息数 | `user/message` + `assistant/message` |
| Token 总量 | `inputTokens + outputTokens`；`cacheReadTokens` **单列、不计入**（与 Claude 一致） |
| 活跃天数 | 有 token 消耗的本地日期数（日界按本地时区） |
| 高峰时段 | 按本地小时桶聚合，取 token 最大的桶 |
| 最常用模型 | 按 token argmax |

只统计 `assistant/message` 的 `usage`。**不累加 `assistant/chunk` / `*-chunks`**——那是流式分片，累加会直接翻倍。

## 实现要点

- 会话日志位于 `<DSH_HOME>/sessions/<cwd 转义>/session-<uuid>/`，落盘格式可能是 `session.full.jsonl`、`session.jsonl`，或 **`session.jsonl.zstd`**（zstd 多帧首尾相接）。
- 多帧 zstd 是个坑：Node 的 `zstdDecompressSync` 和流式解压**都只处理第一帧**（47KB 的日志只解出 150 字节的会话头）。这里按 frame magic 切分逐帧解，解失败就把该段并进下一帧重试。
- 宿主半维护「文件路径 → mtime/size → 聚合结果」索引，并落盘到 `<DSH_HOME>/.cache/usage-stats.json`：冷扫 100MB 级日志约 7 秒，热启动约 60ms，之后按 mtime 增量。
- 缓存只存聚合数字，**不含对话正文**。
- 会话根目录不写死绝对路径：依次尝试 `DSH_SESSIONS_DIR`、`DSH_HOME`、进程参数里的 profile 路径、工作目录逐级向上的 `.dsh`、`~/.dsh`，再按活跃度择优。

## 目录结构

```
dsh-client-ui-usage/
├── package.json
├── cordis.patch.yml      # bundles 方式用的组合补丁
└── lib/
    ├── index.js          # host：/usage-balance 余额代理、/usage-stats 会话扫描
    └── client.js         # client：UsageButton（余额/统计面板）+ 统计仪表盘
```

## 接口

| 路由 | 说明 |
|---|---|
| `GET /usage-balance` | 转发 DeepSeek 余额接口，返回 `{ ok, is_available, balance_infos }` |
| `GET /usage-stats[?refresh=1]` | 返回全量聚合数据（会话数组 + 日桶 + 模型列表），范围过滤在前端做 |

## 已知限制

- 热力图固定 53 周；范围切换只压暗范围外的格子，不裁剪。
- 点击某天查看当天会话列表尚未实现。
- 余额查询只支持 DeepSeek 官方（`api.deepseek.com`），其他 provider 未接入。

## License

MIT
