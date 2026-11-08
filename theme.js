// 主题预载:渲染前同步设置 data-theme,避免暗色用户首帧看到亮色闪烁(FOUC)。
// 必须以阻塞脚本放在 styles.css 之前;独立成文件是为了让 CSP 以 script-src 'self'
// 收紧(内联脚本需要放开 unsafe-inline)。隐私模式读取失败时交给 app.js 的默认逻辑。
(() => {
  try {
    const saved = localStorage.getItem('nav-theme');
    const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (_) {}
})();
