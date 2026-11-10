// 起点导航 Service Worker(零构建手写,无依赖)
// 策略:
//   站点数据 sites.js —— stale-while-revalidate:先回缓存让页面立即渲染,后台回源比对,
//     内容有变化才更新缓存并 postMessage 通知页面热更新(新站点部署后当前会话即生效,
//     弱网/离线不再白等 3s 超时);
//   页面壳/样式/脚本 network-first(在线总是最新,离线回退缓存);
//   图标 cache-first(内容基本不变,首次访问后常驻缓存)。
// 发版无需手动清缓存:activate 阶段按 CACHE_NAME 淘汰旧版本,改版时递增版本号即可。
const CACHE_NAME = 'nmstart-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './theme.js',
  './core.js',
  './app.js',
  './sites.js',
  './manifest.json',
  './assets/icons/favicon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  const path = new URL(request.url).pathname;

  // 站点数据(?ts= 强制回源请求也归一到这里):stale-while-revalidate。
  // 有缓存立即返回并后台回源;回源内容与缓存不同才更新缓存并通知页面热更新,
  // 内容未变不打扰页面(避免「通知→重取→再通知」的自激循环)。
  if (path.endsWith('/sites.js')) {
    event.respondWith(
      caches.match(path).then((hit) => {
        const revalidating = fetch(request)
          .then((response) => {
            if (!response.ok) return response;
            return caches.match(path).then((cached) => {
              // 首次进缓存:内容就是网络版,页面正在等这份响应,不必再让它自我热更
              if (!cached) {
                return response.clone().text().then((text) => caches.open(CACHE_NAME)
                  .then((cache) => cache.put(path, new Response(text, { headers: response.headers })))
                  .then(() => response));
              }
              return Promise.all([response.clone().text(), cached.text()]).then(([freshText, cachedText]) => {
                if (freshText === cachedText) return response;
                return caches.open(CACHE_NAME)
                  .then((cache) => cache.put(path, new Response(freshText, { headers: response.headers })))
                  .then(() => self.clients.matchAll())
                  .then((clients) => {
                    clients.forEach((client) => client.postMessage({ type: 'NAV_SITES_UPDATED' }));
                    return response;
                  });
              });
            });
          })
          .catch(() => caches.match('./index.html'));
        // 有缓存:立即返回缓存,revalidating 作为后台任务继续跑(结果不采用);
        // 无缓存(首次访问/已被清理):等网络,失败退回页面壳,由页面预载数据兜底
        return hit || revalidating;
      })
    );
    return;
  }

  // 站点图标:缓存优先,未命中回源并写入(新增站点图标随首次访问自动进入缓存)
  if (path.startsWith('/assets/icons/')) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((response) => {
        // 只缓存成功响应:错误页(404/500)不该顶替图标,否则离线时错误页被当成图标常驻
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
    return;
  }

  // 其余同源资源:网络优先,离线回退缓存。
  // 以路径为缓存键,sites.js?ts= 的强制回源请求离线时也能命中缓存的 sites.js。
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 错误响应(含中间代理的 502)不入缓存,离线回退才不会拿到错误页
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(path, copy));
        }
        return response;
      })
      .catch(() => caches.match(path).then((hit) => hit || caches.match('./index.html')))
  );
});
