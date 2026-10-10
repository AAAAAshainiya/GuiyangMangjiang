# 给接手 AI 的交接说明

本项目是已上线“贵阳捉鸡麻将”的 v42 完整源码导出，不是新建空项目。原始 main 有43次提交，HEAD 为 `eb6fc2e5cdedc9564de3c8b4f3eee0f310de0cbe`。源码包增加的是可移交的说明、测试入口、迁移／部署辅助脚本和示例配置；游戏页面、业务逻辑、样式、资源没有改写；仅交接副本修复v27/v28旧测试加载器的互动组件映射，也没有重新发布线上网站。

## 上传 GitHub 时保留历史

推荐先从同目录附带的 bundle 克隆，再将 ZIP 中 `guiyang-mahjong/` 的文件覆盖进去。不要用 ZIP 中的 `history/` 再嵌套一个 Git 仓库，不要提交 node_modules、构建产物、真实 .env 或 Cloudflare token。

```sh
git clone --branch main guiyang-mahjong-v42-history.bundle guiyang-mahjong
cd guiyang-mahjong
# 将 ZIP 内 guiyang-mahjong/ 内容覆盖到这里，包含 .gitignore 等文件。
# 删除原历史中被跟踪的 tsconfig.tsbuildinfo；包内已排除它。
git rm --ignore-unmatch tsconfig.tsbuildinfo
git remote set-url origin <用户提供的GitHub仓库地址>
git add .
git diff --cached --stat
git commit -m "Add portable v42 source handoff and development documentation"
git push -u origin main
```

需要本人提供 GitHub 目标仓库及登录权限；包里没有 GitHub 凭据。若目标仓库已有提交，先 fetch／检查分支并合并或使用新分支，不能默认强制覆盖。不要 `git init` 后把已有43次历史当作全新首次提交。ZIP 是最新工作树，bundle 是未改写的原始历史；两者差异在 `docs/导出清单.json` 中列出。

## 启动与验证

按根目录中文 README 操作。使用 pnpm 11.25.0 的 `pnpm-lock.yaml`，不要无理由重新解析全部依赖或删除锁文件。`npm test` 是36个当前可用测试；`npm run test:all` 保留并运行45个历史测试，其中9个在本次检查失败。不可声称历史测试全绿，详情见验证报告。`npm run test:runtime` 要先构建，直接运行真实生产 Worker 和临时 D1/R2，不打开预览服务器。

## 上线与数据

部署到用户自己的 Cloudflare Workers + D1 + R2，可按 README 配置；GitHub Pages 只能托管静态文件，不能替代该后端。迁移其他 Node 服务或国内服务器需要适配 `cloudflare:workers`、D1 SQL接口、R2对象接口、Worker入口，不能只改一个启动命令便宣称后端迁移成功。

生产账号、密码摘要、会话、私人账单、回放、用户上传照片、数据库备份未导出。新部署是独立空数据库，不能访问原站账号。公开版本记录附带为种子，只代表原站真实部署历史，不代表新地址已经部署成功。 `.openai/hosting.json` 保留原站公开项目标识供追溯；通过自有 Cloudflare 部署脚本不会使用它去改动原站。不要拿它或原站地址当作新仓库的部署凭据。

## 与用户协作的约束

用户提出建议后，只有明确要求“修改网页”才执行网页修改。每次真实代码／发布活动更新开发日志，成功发布才更新“已上线规则”和网页版本记录；不要重新建立尚未修改规则文档。Word仅在用户明确要求时导出。保留“Created by Ashaini白告然”水印。不要擅自改主题背景、麻将积分、账号归属或去除历史记录。

后续版本签名私钥应通过 `prepare-release.mjs` 临时生成，只存在发布会话内存，不落盘／不提交。v42 私钥已经销毁，源代码只有公钥；这是正常设计。新版本须先确定真实提交和成功部署时间，再签名登记，不用本次 ZIP 导出时间冒充网站发布记录。
