# 起点导航 · 个人常用网站集合

一个纯静态的个人导航起始页：**无框架、无构建、零依赖**，收录个人常用的开发、AI、设计与效率工具，让常用网站一触即达。

**在线访问**：<https://nmstart.github.io/>

## 特性

- **即时搜索**：按名称、简介、标签模糊匹配，命中高亮；`/` 或 `⌘K`（Windows 为 `Ctrl K`）聚焦搜索框，`Esc` 清空
- **分类筛选**：文字标签 + 渐变滑动指示条，横向溢出时边缘渐隐提示
- **状态同步**：搜索词与分类写入 URL（`?q=…&cat=…`），可分享、可前进后退
- **最近访问**：localStorage 记录最近 12 次访问，卡片角标提示，并提供独立分类视图
- **自定义排序**：按住卡片拖到目标位置（触屏长按进入拖拽），顺序保存在本地；聚焦卡片后 `Alt+↑/↓` 微调，可一键恢复默认
- **复制网址**：卡片右上角一键复制，Toast 轻提示反馈
- **深浅色主题**：跟随系统偏好，可手动切换（View Transitions 平滑过渡），选择持久化
- **键盘友好**：方向键在卡片网格间移动焦点，回车直接打开
- **细节**：回到顶部、空状态引导、焦点样式、`prefers-reduced-motion` 降级

## 快速开始

仓库即站点根目录，任意静态服务器即可本地预览：

```bash
python3 -m http.server 8000
# 浏览器打开 http://127.0.0.1:8000
```

## 目录结构

```
.
├── index.html            # 唯一页面（含站点卡片模板）
├── styles.css            # 全部样式（设计令牌集中在 :root）
├── app.js                # 渲染与交互逻辑（无第三方依赖）
├── sites.js              # 站点数据（手动维护，见下）
├── assets/icons/         # 站点图标 + favicon.png
└── .github/workflows/    # CI 校验
```

## 维护站点数据

编辑 [sites.js](sites.js) 即可增删站点，字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `name` | 是 | 显示名称 |
| `url` | 是 | 跳转地址，全表不可重复 |
| `category` | 是 | `dev` / `docs` / `ai` / `design` / `learn` / `productivity` / `discover` / `fun` |
| `description` | 是 | 一句话简介，参与搜索匹配 |
| `tags` | 否 | 标签数组，参与搜索匹配 |
| `icon` | 否 | 图标路径；省略时自动尝试目标站 favicon，失败降级为名称首字符 |

图标建议持久化到 `assets/icons/`（以域名命名，如 `github.svg`），避免外链失效。

站点顺序支持本地拖拽自定义（存于浏览器 localStorage）；在 sites.js 新增的站点会排在这些自定义顺序之后。

## CI 校验

推送到 `main` 或提交 PR 时，GitHub Actions 自动执行四项检查（见 [.github/workflows/ci.yml](.github/workflows/ci.yml)）：

1. **JS 语法检查** —— `app.js`、`sites.js`
2. **静态资源引用完整性** —— `index.html` 的脚本/样式引用、`sites.js` 中每个 `icon` 路径对应的文件必须存在
3. **数据卫生检查** —— 站点记录字段合法、URL 不重复
4. **空白字符检查** —— 不允许引入行尾空白

## 部署

本仓库即 GitHub Pages 用户主站（`nmstart.github.io`），推送 `main` 分支后自动发布，无需额外配置。

## License

[Apache-2.0](LICENSE)
