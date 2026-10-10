# 贵阳捉鸡麻将 · v43 完整项目

这是当前已上线网站的完整源码与可继续开发的交接包。原站：[贵阳捉鸡麻将](https://guiyang-mahjong-table.ashainidwq.chatgpt.site)。代码基线为 `3ccd4b6e990caf927c70f4ed6b75f5f4b7e5299a`（线上成功部署记录时间2026-10-10 22:21:50，北京时间），原 Git main 有 **44 次提交**，不是全新项目。本次先发布v43，修复普通窗口结算时桌面区域塌陷；交接包与该已上线提交逐字节核对，导出阶段没有另改游戏功能。源码和历史的对应关系见 `docs/导出清单.json`。

## 技术栈与环境

| 项目 | 版本／说明 |
|---|---|
| Node.js | 推荐24.19.0，本次实测版本；.nvmrc 已提供。原引擎约束>=22.13.0，其他版本未实测。 |
| pnpm | 11.25.0；唯一依赖锁文件是 pnpm-lock.yaml，不提供虚构的 package-lock.json。 |
| React／React DOM | 19.2.6 |
| Next API／路由约定 | next 16.3.4；实际构建与运行使用 Vinext，不是 next build。 |
| Vinext／Vite | 1.0.0-beta.5／8.0.13 |
| TypeScript／Tailwind CSS | 5.9.3／4.2.1 |
| Cloudflare Vite 插件／Wrangler | 1.37.1／4.92.0 |
| 后端与持久数据 | Cloudflare Workers（nodejs_compat）、D1 SQLite、R2对象存储 |
| 其他主要库 | Drizzle ORM 0.45.2、ExcelJS 4.4.0、Lucide、Base UI／shadcn组件 |

macOS、Linux、Windows可用正常 Node/pnpm 安装。默认使用 portable 配置，不依赖原开发机器绝对路径或 Sites 插件。Linux x64 和上述 Node 实际验证通过；Windows／macOS未实机验证。底层 workerd 本地模拟器需要它支持的操作系统和架构。

## 包含哪些内容

- `app/`：首页、单人、新手、牌桌／规则／结算／账户／历史／回放／互动界面，以及完整HTTP API。
- `lib/`：麻将引擎、积分、合法操作、人机、单人暂停／重开、教程、联机协调、音效合成、账号、回放、规则Excel、主题等。
- `components/`、`hooks/`、`app/globals.css`：完整组件、响应式样式与工具。
- `public/`：Logo、favicon、27种万／筒／条牌面WebP及原有SVG；所有源码引用的静态资源均已保留。
- `db/schema.ts`、`drizzle/`：数据库结构及0000—0005六份SQL迁移、Drizzle快照和迁移日志。
- `build/`、`scripts/`：完整Worker入口、Vite插件、运行与构建脚本、导出新增的测试／独立部署辅助脚本。
- `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`：依赖与供应链策略；Vite、TS、Tailwind/PostCSS、Drizzle、ESLint配置全部保留。
- `docs/`：中文交接、验证报告、规则与开发日志快照、公开版本历史、导出清单。
- `history/guiyang-mahjong-v43-history.bundle`：可恢复原44次提交的 Git bundle；另单独提供同一个bundle文件。

音效由Web Audio代码合成，无缺失音频文件，也没有BGM。界面字体使用系统字体栈，没有运行时下载的外部字体文件。未发现缺失源码或源码引用的静态资源。**用户上传照片是R2生产数据，不是内置资源，未导出**；生产账号、密码摘要、会话、私人账单、回放、数据库备份均未包含。新建数据库会是空账号与空对局，原站数据不会自动迁移。

## 安装、初始化和启动

先安装Node.js 24.19.0和pnpm 11.25.0；如果尚无pnpm：

```sh
npm install --global pnpm@11.25.0
```

在解压后的项目根目录执行：

```sh
pnpm install --frozen-lockfile
npm run build
npm run db:migrate:local
# 可选：恢复原站公开版本表，不导入任何玩家数据。
npm run db:seed:local
npm run dev
```

开发地址通常为 `http://localhost:5173`，以终端输出为准。普通pnpm安装会使用项目相对的缓存配置；本交付不包含node_modules，需重新安装。禁止在运行安装时同时更改依赖或锁文件。

构建后的本地生产Worker：

```sh
npm run build
npm run db:migrate:local
npm start
```

`npm start`在127.0.0.1启动Wrangler本地生产Worker；用终端显示的端口，或 `npm start -- --port 8787`。不要同时启动两个使用同一端口的进程。开发和生产预览共享本地 `.wrangler/state`，不写入线上数据库。局域网浏览器若要验证账号Secure Cookie，请使用HTTPS，不能假定手机访问普通HTTP局域网IP即可保持登录；localhost开发例外取决于浏览器安全规则。

## 测试与构建命令

```sh
npm run typecheck
npm test
npm run build
npm run test:runtime
# 可选：包括所有旧测试，当前已知会返回失败状态。
npm run test:all
```

| 命令 | 本次结果 |
|---|---|
| pnpm install --frozen-lockfile --prod=false --prefer-offline | 成功；v43本次冻结安装检查Already up to date，3.7秒、锁文件不变；复用v42独立新安装的718包（当时缓存718、下载0），没有从原站复制node_modules。 |
| npm run typecheck | 成功 |
| npm test | 当前测试入口36/36通过；明确排除9个不兼容的历史夹具，未删除它们。 |
| npm run build | 成功；完整客户端分析／服务端分析／RSC／客户端／SSR五阶段，生成dist/client与dist/server。 |
| 45个原有测试全部执行（此前v42交接） | 此前v42首次34通过、11失败；为v27/v28测试补齐新增互动组件的导入映射后，两项复查通过。最终36项通过，9项历史夹具仍失败（八项旧模拟缺少模块／链接不兼容，一项规则编辑器忽略登录权限）。原文件保留，逐项见验证报告。 |
| npm run test:runtime | 成功；真实生产Worker直接dispatch：三个SSR页面、图片／牌面、六份D1迁移、注册／登录态、满人机房间被好友替换及R2绑定。 |
| npm run db:migrate:local | v43复查无待迁移项；v42首次六份迁移成功，v43运行检查的临时D1也实际执行全部六份。 |
| npm run db:seed:local | 成功；仅写入原站公开v30—v43部署历史 |
| npm run deploy:dry-run | 成功；使用虚拟资源ID验证部署包及DB／BUCKET绑定，没有创建或上传生产资源。 |
| 原Git bundle恢复 | 实际克隆、44次提交、HEAD与文件树核对通过。 |

v43当前36项已重新运行并全部通过；全量45项未在v43重跑，9项历史夹具的不兼容结论沿用v42检查。源码CSS级联核对七组普通／全屏／手机横竖屏，普通桌面结算区恢复650px；这不是浏览器几何实测。

详细运行结果和验证范围见 `docs/验证报告.md`。lint、真实浏览器／手机画面与触控、真实系统全屏、弱网、国内可达性、自有Cloudflare远端生产部署 **未执行**；原站Sites v43已成功部署。没有把组件或CSS计算当成真机验证。构建有大于500KB的客户端chunk和Vinext动态路由分类提示，非构建失败。

## 环境变量与外部服务

游戏账号系统使用本站账号密码，不需要登录GPT。核心后端使用两个资源绑定：

| 配置 | 用途／设置位置 |
|---|---|
| DB | D1数据库，房间、账户、会话摘要、规则、账单、回放及版本记录 |
| BUCKET | R2桶，用户头像和私有备份对象 |
| deploy.config.json | 独立部署的Worker名称、Cloudflare账户ID、D1名称／ID、R2桶名称；从示例复制，忽略提交 |
| CLOUDFLARE_API_TOKEN | 仅自动部署认证，可选；手动wrangler login不需要。放CI安全变量，不能放源码或ZIP |
| CLOUDFLARE_ACCOUNT_ID | 自动部署选择账户，可选；脚本实际Worker配置从deploy.config.json读取 |
| .env.example | 仅变量名和示例值；游戏无需应用密钥，DB／BUCKET不是字符串环境变量 |

本项目不自动将.env.example当成真实配置读取。自动部署通过安全环境变量传入token，或按Wrangler的 `--env-file`机制；本项目部署命令推荐安全环境变量。密码盐、会话token、恢复码在服务器安全生成，密码／恢复码只保存摘要。版本记录源码仅有公钥；v43私钥已销毁，不在ZIP或bundle中。未来新增版本按 `RELEASE.md`生成临时签名密钥，并用实际成功部署时间登记。

源项目保留Sites专用的 `.openai/hosting.json`、构建兼容层、可选GPT登录／连接器代码，以完整恢复既有源码。游戏实际不依赖GPT登录或第三方连接器；独立Cloudflare部署使用自有账户、DB和BUCKET，不向原Sites项目推送或部署。原project_id是追溯标识，不是凭据。

## 使用自己的Cloudflare上线

需要自己的Cloudflare账号，开通Workers、D1、R2及相应权限。R2未开通时上传头像／备份不可用，只有静态托管不能代替后端。

1. 安装依赖并构建。运行 `pnpm exec wrangler login`完成本人登录；CI改用最小必要权限的安全token。
2. 运行 `pnpm exec wrangler d1 create guiyang-mahjong-db`；记录返回的database_id。
3. 运行 `pnpm exec wrangler r2 bucket create guiyang-mahjong-avatars`；取自己的Cloudflare账户ID。
4. 将 `deploy.config.example.json`复制为 `deploy.config.json`，填写自己的workerName、accountId、databaseName、databaseId、bucketName；不填写token。
5. 执行以下命令：

```sh
npm run build
npm run deploy:configure
npm run db:migrate:remote
# 可选：只恢复原站公开版本历史；时间不是新部署时间。
npm run db:seed:remote
npm run deploy:dry-run
npm run deploy
```

脚本保留Vinext生成的ESM模块／assets配置，输出 `dist/server/wrangler.deploy.json`并用真实D1/R2绑定替换本地占位符。每次重建后重新生成部署配置。发布后使用返回的HTTPS地址验证账号、联机、头像和回放；自有域名可再在Cloudflare配置。上述**自有Cloudflare远端创建／迁移／实际发布未在本次执行**，避免改动用户原站或替用户创建未指定的资源。

D1迁移按Wrangler迁移表只运行尚未执行的SQL。不要反复直接执行建表文件；结构变更运行 `npm run db:generate`生成新迁移，再检查SQL后应用。先做自己的数据库备份再迁移生产。公开版本种子使用ON CONFLICT DO NOTHING，不改已登记条目。

GitHub仓库用于保存与协作；**GitHub Pages不能完整运行本项目的账号和联机后端**。如改为国内Node服务器，需要适配Worker、D1和R2接口并重新验证，当前包没有伪装成已完成该迁移。

## Git历史与继续开发

单独bundle与ZIP内副本一致，包含原main完整44次提交、HEAD及全部可达对象，不包含.git/config、远程登录凭据、reflog或当前本地运行数据库。原历史曾跟踪tsconfig.tsbuildinfo；为保留真实提交，bundle中该历史内容未改写，但ZIP工作树不含缓存文件，.gitignore已补齐。

本次仅在交接副本中为两个旧测试加载器补充导入映射，游戏代码与线上v43一致；原始测试版本仍可从bundle恢复。

另一个AI按 `docs/交给另一个AI.md`先从bundle克隆，再覆盖ZIP工作树、移除原跟踪缓存、创建一个交接提交后推送用户指定仓库。不要重新git init抹掉历史，也不要默认force-push覆盖已有远程提交。

## 已知限制与未完成事项

- 9个历史测试仍不兼容当前代码，保留原文件且明确标注；当前36个测试和独立生产运行检查通过，不声称历史全绿。
- 没有真实手机／浏览器QA，手机全屏、动画、音效听感和极端尺寸仍需人工验收。中国大陆访问稳定性未实测。
- 当前联机为HTTP轮询和D1乐观并发，不是已部署的WebSocket／房间Durable Object架构；真实大量并发和弱网压力未测。
- 备份重试依赖请求，没有无人访问时的定时执行；新服务器需要自行安排数据库灾难恢复。
- 单机提交的记录不是防作弊排名依据；新手不归档账户、不提供回放；单人需主动开启录制。单人／多人各保留最近30局非收藏回放，收藏保留。
- 不包含原站私人数据与用户上传照片。历史版本表种子仅为公开原站记录，不能恢复旧回放或账户。
- 现有27张牌面资源都已打包；其原始版权授权文件未取得，不宣称已完成“官方牌面”授权认证。第三方组件原有许可证文件已保留，其他依赖授权应以安装包LICENSE为准。
- Vinext目前为beta，版本升级需先跑类型、构建、计分／账户／回放回归；不要直接替换为Next构建而假定Worker行为相同。
