// 起点导航 Service Worker(零构建手写,无依赖)
// 策略:页面壳/样式/脚本/站点数据 network-first(在线总是最新,离线回退缓存),
// 图标 cache-first(内容基本不变,首次访问后常驻缓存);
// 发版无需手动清缓存:activate 阶段按 CACHE_NAME 淘汰旧版本,改版时递增版本号即可。
const CACHE_NAME = 'nmstart-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './theme.js',
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

  // 站点图标:缓存优先,未命中回源并写入(新增站点图标随首次访问自动进入缓存)
  if (path.startsWith('/assets/icons/')) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
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
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(path, copy));
        return response;
      })
      .catch(() => caches.match(path).then((hit) => hit || caches.match('./index.html')))
  );
});
