# Security Policy

## 支持版本

本项目为个人静态站点，无版本发布流程：仅最新的 `main` 分支获得安全修复。

## 报告漏洞

请通过 GitHub 的「私下报告安全漏洞」（Private vulnerability reporting）功能提交，或在 Issue 中注明仅为非敏感问题。

本项目为纯静态站点（无后端、无用户数据上报、无第三方依赖），重点关注面：

- XSS 注入（`sites.js` 数据进入 DOM 的路径）
- 仓库与 GitHub Pages 部署配置
- 供应链（当前无第三方包，若未来引入请同步评估）

收到报告后一般会在一周内回应；确认后将在 `main` 修复并发布。
