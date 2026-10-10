# Render + Turso 免费部署

完整保留现有游戏功能。网站运行在 Render，账号、房间、聊天、账单、回放、头像及私人备份持久保存在自己的 Turso 数据库中。不会导入原站私人数据。Cloudflare 授权失败不影响这条部署路径。

## 1. 创建 Turso 数据库

打开 https://app.turso.tech/ ，用自己的 GitHub 账号登录，选择 Free，创建一个 **libSQL** 数据库（SDK 为 `@libsql/client`），例如 `guiyang-mahjong`。地区尽量靠近 Render 服务地区。

从数据库页面取得数据库 URL 和具有读写权限的数据库 Auth Token。URL 通常为 `libsql://你的数据库地址.turso.io`，也可以使用 HTTPS URL。不是 Turso 平台管理 API Token。Token 只填写到 Render 的服务器环境变量，不发送到聊天、截图、GitHub 或 ZIP 中。

若页面区分 Turso Database 与 libSQL 引擎，请选 libSQL；当前适配器和六份原 SQL 迁移使用 libSQL 兼容性。远端数据库需要用实际凭据再验收。

## 2. 创建 Render 网站

登录 https://dashboard.render.com/ ，打开：

https://render.com/deploy?repo=https://github.com/AAAAAshainiya/GuiyangMangjiang

Render 会读取仓库根目录 `render.yaml`。确认服务类型为 Web Service、套餐 Free，填写：

| 环境变量 | 内容 |
|---|---|
| TURSO_DATABASE_URL | 你的 Turso 数据库 URL |
| TURSO_AUTH_TOKEN | 该数据库的读写 Auth Token（作为 Secret 保存） |

Node 版本、构建和启动命令已在配置里提供。启动时自动检查并执行尚未执行的六份迁移，还会创建 Node 专用的对象存储表。每份迁移在事务内执行，并记录哈希；重复启动不会重复建表。已经执行的迁移内容不能事后改写。

如果不用 Blueprint，可手动 New → Web Service，连接 `AAAAAshainiya/GuiyangMangjiang` 仓库，使用：

| 配置 | 值 |
|---|---|
| Branch | main |
| Runtime | Node |
| Instance Type | Free |
| Build Command | npm install --global pnpm@11.25.0 && pnpm install --frozen-lockfile --prod=false && npm run build:node |
| Start Command | npm run start:node |
| Health Check Path | /api/health |
| NODE_VERSION | 24.19.0 |
| MAHJONG_HOSTING | node |

另外填写上述两个 Turso 环境变量。无需 Persistent Disk，也无需 Render Postgres。缺少独立数据库配置时启动会停止，避免把玩家数据误写到临时磁盘。

## 3. 验证上线

等 Render 部署显示 Live 后，使用 Render 实际返回的 HTTPS 地址。`/api/health` 应返回 `{"status":"ok"}`。检查注册／登录、开桌、另一个浏览器加入、上传头像、账单／回放和备份，再手动重启服务验证数据仍在。

Node 入口监听 `0.0.0.0:$PORT`，通过 Render 自动设置的 `RENDER_EXTERNAL_URL` 校验请求来源。使用自定义域名时，额外设置 `PUBLIC_BASE_URL=https://你的域名` 并重新部署。它不是凭据。账号 Cookie 保持 HttpOnly、Secure、SameSite=Lax。

只有 Node 部署使用数据库对象表替代 R2；Cloudflare 原部署仍保留原 DB／BUCKET 绑定。版本签名没有改写；公开原站历史的种子不是本次上线时间，不自动导入。

## 免费方案的限制

- Render 免费网站闲置 15 分钟后休眠，再次打开通常需要约一分钟唤醒。按月有实例小时、带宽和构建额度。持续联机轮询会消耗实例时间、网络和数据库读取额度。
- Render 本地磁盘会在重启、休眠和重新部署时清空，所以线上强制使用独立 Turso 数据库。
- Turso Free 当前提供 5 GB 存储及按月读写额度。头像、备份、聊天和回放都占用数据库额度；头像保留原 350 KB 上限。不承诺大规模并发性能。
- 不启用付费套餐或自动超额消费。套餐规则以创建时控制台为准。免费额度用完时可能暂停或需要用户自行决定升级。
- 账户备份与主数据在同一个数据库，属于用户恢复副本，不是跨供应商灾难恢复。Turso 的数据库备份／导出需要另行安排。
- 原站用户、头像、密码、对局等私人数据未导出；新网站需要重新注册。国内可达性与真实多人压力尚未测量。

参考官方资料：[Render Free](https://render.com/docs/free)、[Render Next.js](https://render.com/docs/deploy-nextjs-app)、[Turso Pricing](https://turso.tech/pricing)、[Turso TypeScript SDK](https://docs.turso.tech/sdk/ts/reference)。

## 本机运行与验证

```sh
pnpm install --frozen-lockfile --prod=false
npm run build:node
npm run start:node
```

默认使用本机 `.node-data/mahjong.sqlite`（忽略提交），地址 `http://127.0.0.1:3000`。可用 `MAHJONG_DATA_DIR` 指定目录。设置 Turso URL 和 Token 后则使用远端数据库；凭据不要提交。

```sh
npm test
npm run test:node-runtime
```

本次本地生产 HTTP 检查覆盖了三个页面和资源、注册／登录／安全 Cookie、房间创建／电脑补位／好友加入／聊天、头像上传／读取、私人备份、重启持久保存及模拟 HTTPS 代理的来源拒绝。存储适配测试覆盖了迁移幂等、事务回滚、房间版本冲突与备份分页。没有把本地 SQLite 检查冒充远端 Turso 上线验收。
