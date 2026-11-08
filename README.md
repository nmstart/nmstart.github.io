# 起点导航 · 个人常用网站集合

一个纯静态的个人导航起始页：**无框架、无构建、零依赖**，收录个人常用的开发、AI、设计与效率工具，让常用网站一触即达。

**在线访问**：<https://nmstart.github.io/>

## 特性

- **即时搜索**：按名称、简介、标签模糊匹配，命中高亮；`/` 或 `⌘K`（Windows 为 `Ctrl K`）聚焦搜索框，`Esc` 清空
- **分类筛选**：文字标签 + 凸起药丸激活态（拟态），横向溢出时边缘渐隐提示
- **状态同步**：搜索词与分类写入 URL（`?q=…&cat=…`），可分享、可前进后退
- **最近访问**：localStorage 记录最近 12 次访问，卡片角标提示，并提供独立分类视图
- **自定义排序**：按住卡片拖到目标位置（触屏长按进入拖拽），顺序保存在本地；聚焦卡片后 `Alt+↑/↓` 微调，可一键恢复默认
- **复制网址**：卡片右上角一键复制，Toast 轻提示反馈
- **深浅色主题**：跟随系统偏好（未手动选择时昼夜切换实时跟随），可手动切换（View Transitions 平滑过渡），选择持久化
- **键盘友好**：方向键在卡片网格间移动焦点，回车直接打开
- **PWA**：Service Worker 离线缓存，支持「添加到主屏幕」全屏使用；部署后在线访问始终拿到最新内容
- **多标签页同步**：最近访问、排序与主题在其他标签页改动后实时同步
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
├── index.html            # 唯一页面（含站点卡片模板与 CSP 策略）
├── theme.js              # 主题预载（防暗色首帧闪烁，阻塞脚本）
├── styles.css            # 全部样式（设计令牌集中在 :root）
├── app.js                # 渲染与交互逻辑（无第三方依赖）
├── sites.js              # 站点与分类数据（单一事实来源，手动维护，见下）
├── sw.js                 # Service Worker（离线缓存策略；改版时递增 CACHE_NAME）
├── manifest.json         # PWA 清单
├── assets/icons/         # 站点图标 + favicon.png
└── .github/workflows/    # CI 校验
```

## 维护站点数据

[sites.js](sites.js) 是站点与分类的**单一事实来源**：分类在 `NAV_CATEGORIES` 中定义，站点在 `NAV_SITES` 中增删，站点记录的 `category` 必须引用已定义的分类 id（CI 校验一致性）。

站点记录字段：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `name` | 是 | 显示名称 |
| `url` | 是 | 跳转地址，仅允许 http/https，全表不可重复 |
| `category` | 是 | 分类 id，必须在 `NAV_CATEGORIES` 中定义 |
| `description` | 是 | 一句话简介，参与搜索匹配 |
| `tags` | 否 | 标签数组，参与搜索匹配 |
| `icon` | 否 | 图标路径；省略时自动尝试目标站 favicon，失败降级为名称首字符 |

图标建议持久化到 `assets/icons/`（以域名命名，如 `github.svg`），避免外链失效；**请压缩到 10KB 以内**（图标展示尺寸仅 22px，过大文件会拖慢首屏）。

站点顺序支持本地拖拽自定义（存于浏览器 localStorage）；在 sites.js 新增的站点会排在这些自定义顺序之后。页面每次加载都会以时间戳参数强制回源拉取 sites.js（绕过 HTTP 缓存），推送后新站点无需等待缓存过期即可见。

## CI 校验

推送到任意分支或提交 PR 时，GitHub Actions 自动执行四项检查（见 [.github/workflows/ci.yml](.github/workflows/ci.yml)）：

1. **JS 语法检查** —— `theme.js`、`app.js`、`sites.js`、`sw.js`
2. **静态资源引用完整性** —— `index.html` 的脚本/样式引用；PWA 清单可解析且图标存在；`sites.js` 中每个 `icon` 路径对应的文件必须存在，未引用的孤儿图标给出提示
3. **数据卫生检查** —— 分类定义合法且 id 唯一；站点记录字段非空、`category` 必须是已定义分类、URL 仅允许 http/https 且不重复、`tags` 须为数组
4. **空白字符检查** —— 对比 PR 基线（或 push 前一提交），不允许引入行尾空白

## 工程约定

- **架构**：零框架、零构建、零第三方依赖；`main` 即发布分支
- **安全**：CSP 见 `index.html`（`script-src 'self'`，无内联脚本）；先转义再注入 HTML
- **命名**：CSS 类名 kebab-case、状态类 `is-*` / `has-*` 前缀；localStorage 键统一 `nav-*` 前缀
- **术语**：数据层一条记录叫 site（`sites.js`），渲染为卡片 card（`.site-card`），可点击区域为 `.card-link`
- **注释**：中文注释统一使用全角标点

## 部署

本仓库即 GitHub Pages 用户主站（`nmstart.github.io`），推送 `main` 分支后自动发布，无需额外配置。

## License

[Apache-2.0](LICENSE)
