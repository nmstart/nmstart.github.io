(async () => {
  'use strict';

  const RECENT_KEY = 'nav-recent-visits';
  const RECENT_LIMIT = 12;
  const ORDER_KEY = 'nav-site-order';
  const SEARCH_RENDER_DELAY_MS = 180;
  const STAGGER_STEP_MS = 35;
  const STAGGER_MAX_INDEX = 11;
  const TOAST_DURATION_MS = 1600;
  const LONG_PRESS_MS = 300;
  const DRAG_THRESHOLD_MOUSE_PX = 6;
  const DRAG_THRESHOLD_TOUCH_PX = 10;
  const SCROLL_TOP_RATIO = 0.6;

  // 注册一次空 touchstart:iOS Safari 只有存在 touch 监听器时才启用 :active 按压态,
  // 借此让拟态的按压凹陷反馈在触屏上可靠生效(passive,不阻塞滚动)。
  document.addEventListener('touchstart', () => {}, { passive: true });

  // 站点数据每次强制回源拉取(时间戳查询参数绕过 HTTP 缓存),部署后新站点立即生效;
  // index.html 里 script 标签预载的 window.NAV_SITES 仅作拉取失败时的兜底。
  // 用动态 import 而非 fetch+eval:HTTP 错误页会因模块解析失败自然走兜底,
  // 不存在误执行响应文本的风险,也无需为 CSP 放开 unsafe-eval。
  const SITES_TIMEOUT_MS = 3000;
  let sites = [];
  let timeoutId = 0;
  try {
    const fresh = await Promise.race([
      import(`./sites.js?ts=${Date.now()}`).then(() => window.NAV_SITES),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('sites fetch timeout')), SITES_TIMEOUT_MS);
      }),
    ]);
    if (Array.isArray(fresh)) sites = fresh;
  } catch (_) {
    sites = Array.isArray(window.NAV_SITES) ? window.NAV_SITES : [];
  } finally {
    clearTimeout(timeoutId);
  }

  // 数据容错:剔除无 URL 的记录,缺省字段补安全默认值,
  // 保证单条坏数据只降级自己,不会中断整批渲染。
  function normalizeSites(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((site) => site && typeof site.url === 'string' && site.url)
      .map((site) => ({
        ...site,
        name: typeof site.name === 'string' ? site.name : '',
        description: typeof site.description === 'string' ? site.description : '',
        tags: Array.isArray(site.tags) ? site.tags.filter((tag) => typeof tag === 'string') : [],
        icon: typeof site.icon === 'string' ? site.icon : '',
      }));
  }

  sites = normalizeSites(sites);
  // 业务分类以 sites.js 的 NAV_CATEGORIES 为单一事实来源(CI 校验数据引用的分类必须已定义);
  // all / recent 是 UI 层的虚拟分类,不进入数据文件。
  // 组装时过滤缺 id/name 的坏项,数据文件被手改坏也不炸 UI。
  const virtualCategories = [
    { id: 'all', name: '全部' },
    { id: 'recent', name: '最近访问' },
  ];
  const dataCategories = (Array.isArray(window.NAV_CATEGORIES) ? window.NAV_CATEGORIES : [])
    .filter((category) => category && typeof category.id === 'string' && category.id && typeof category.name === 'string');
  const categories = [...virtualCategories, ...dataCategories];

  const state = { query: '', category: 'all' };
  // 生效分类:搜索时跨全部分类(分类是浏览过滤器,搜索优先),清空搜索后回到原分类
  const effectiveCategory = () => (state.query.trim() ? 'all' : state.category);
  const grid = document.querySelector('#site-grid');
  const template = document.querySelector('#site-card-template');
  const searchInput = document.querySelector('#search-input');
  const searchClear = document.querySelector('#search-clear');
  const categoryList = document.querySelector('#category-list');
  const resultsCount = document.querySelector('#results-count');
  const clearButton = document.querySelector('#clear-button');
  const clearRecent = document.querySelector('#clear-recent');
  const emptyState = document.querySelector('#empty-state');
  const emptyReset = document.querySelector('#empty-reset');
  const themeToggle = document.querySelector('#theme-toggle');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const backToTop = document.querySelector('#back-to-top');
  const controls = document.querySelector('.controls');
  const mainEl = document.querySelector('main');
  const toast = document.querySelector('#toast');
  const searchShortcut = document.querySelector('#search-shortcut');
  const resetOrder = document.querySelector('#reset-order');
  const errorState = document.querySelector('#error-state');

  document.querySelector('#current-year').textContent = new Date().getFullYear();

  /* ---------- 工具 ---------- */

  const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
  }

  // 在原始文本上命中关键词,再对切分出的片段逐一转义拼接:
  // 若先转义再匹配,搜索 amp/lt 等词会命中 &amp; 这类实体内部,把转义串拆花。
  function highlightText(text, query) {
    const raw = String(text);
    const keyword = query.trim();
    if (!keyword) return escapeHtml(raw);
    const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(pattern, 'gi');
    const parts = [];
    let last = 0;
    let match;
    while ((match = regex.exec(raw))) {
      parts.push(escapeHtml(raw.slice(last, match.index)), '<mark>', escapeHtml(match[0]), '</mark>');
      last = match.index + match[0].length;
      if (match[0].length === 0) regex.lastIndex += 1; // 防御空匹配导致的死循环
    }
    parts.push(escapeHtml(raw.slice(last)));
    return parts.join('');
  }

  function showToast(message) {
    clearTimeout(showToast.timer);
    toast.textContent = message;
    toast.hidden = false;
    requestAnimationFrame(() => {
      toast.dataset.visible = 'true';
    });
    showToast.timer = setTimeout(() => {
      delete toast.dataset.visible;
      setTimeout(() => {
        toast.hidden = true;
      }, 200); // 与 .toast 的隐藏过渡时长一致
    }, TOAST_DURATION_MS);
  }

  /* ---------- 本地存储(隐私模式降级 + 会话内缓存) ---------- */

  // 一次渲染会多次读取同一份数据,解析结果按 key 缓存,写入/清除时同步失效,
  // 避免每次渲染对 localStorage 做几十次 JSON.parse。
  const storageCache = new Map();

  function readStoredList(key, isValidItem) {
    if (!storageCache.has(key)) {
      let list = [];
      try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) list = parsed.filter(isValidItem);
      } catch (_) {
        list = [];
      }
      storageCache.set(key, list);
    }
    return storageCache.get(key);
  }

  function writeStoredList(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch (_) {
      // 存储不可用时静默降级：记录仅在本会话内生效。
    }
    storageCache.set(key, list);
  }

  function clearStoredList(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {
      // 存储不可用时视为已清除。
    }
    storageCache.delete(key);
  }

  /* ---------- 最近访问 ---------- */

  const readRecent = () => readStoredList(RECENT_KEY, (item) => Boolean(item) && typeof item.url === 'string');

  function pushRecent(url) {
    const list = readRecent().filter((item) => item.url !== url);
    list.unshift({ url, t: Date.now() });
    writeStoredList(RECENT_KEY, list.slice(0, RECENT_LIMIT));
  }

  const recentUrlSet = () => new Set(readRecent().map((item) => item.url));

  /* ---------- 站点排序(本地持久化) ---------- */

  const readOrder = () => readStoredList(ORDER_KEY, (item) => typeof item === 'string');

  const writeOrder = (list) => writeStoredList(ORDER_KEY, list);

  // 把可见视图内 from→to 的移动映射回全局顺序:以目标位的可见项为锚点插入,
  // 夹在两者之间、未在本视图显示的站点保持原有邻接关系。
  function reorderGlobal(cards, from, to) {
    const moved = cards[from]?.dataset.url;
    const neighbor = cards[to]?.dataset.url;
    if (!moved || !neighbor || moved === neighbor) return;
    const current = readOrder();
    const known = new Set(current);
    const fullOrder = [...current, ...sites.filter((site) => !known.has(site.url)).map((site) => site.url)];
    const rest = fullOrder.filter((url) => url !== moved);
    const at = rest.indexOf(neighbor);
    if (at === -1) return;
    const next = to < from
      ? [...rest.slice(0, at), moved, ...rest.slice(at)]
      : [...rest.slice(0, at + 1), moved, ...rest.slice(at + 1)];
    writeOrder(next);
  }

  /* ---------- 分类 ---------- */

  function countForCategory(id) {
    if (id === 'all') return sites.length;
    if (id === 'recent') return readRecent().length;
    return sites.filter((site) => site.category === id).length;
  }

  function createCategoryButtons() {
    categories.forEach((category) => {
      const button = document.createElement('button');
      button.className = 'category-button';
      button.type = 'button';
      button.dataset.category = category.id;

      const name = document.createElement('span');
      name.textContent = category.name;
      button.append(name);

      button.addEventListener('click', () => {
        if (state.category === category.id) return;
        state.category = category.id;
        dispatchState({ animate: true });
      });
      categoryList.append(button);
    });
    updateCategoryButtons();
  }

  function updateCategoryButtons() {
    const active = effectiveCategory();
    categoryList.querySelectorAll('.category-button').forEach((button) => {
      const id = button.dataset.category;
      const count = countForCategory(id);
      button.setAttribute('aria-pressed', String(id === active));
      // 「最近访问」在没有记录时不占位。
      button.hidden = id === 'recent' && count === 0;
    });
    syncCategoryOverflow();
    scrollActiveTabIntoView();
  }

  /* ---------- 分类横向滚动 ---------- */

  // 分类溢出时右缘渐隐提示(CSS has-overflow);宽度变化(旋转屏幕)后同步一次。
  function syncCategoryOverflow() {
    categoryList.classList.toggle('has-overflow', categoryList.scrollWidth > categoryList.clientWidth + 1);
  }

  const categoryListObserver = new ResizeObserver(() => {
    syncCategoryOverflow();
    // 旋转屏幕等宽度变化后,选中的分类可能被挤出可视区。
    scrollActiveTabIntoView();
  });
  categoryListObserver.observe(categoryList);

  // 选中分类落在横向滚动条可视区外时(深链接、旋转屏幕),把它滚回视野内。
  function scrollActiveTabIntoView() {
    const active = categoryList.querySelector('.category-button[aria-pressed="true"]:not([hidden])');
    if (!active) return;
    const listRect = categoryList.getBoundingClientRect();
    const btnRect = active.getBoundingClientRect();
    if (btnRect.width === 0) return;
    // 1px 容差:子像素舍入造成的临界差不算出界。
    if (btnRect.left >= listRect.left - 1 && btnRect.right <= listRect.right + 1) return;
    const delta = btnRect.left + btnRect.width / 2 - (listRect.left + listRect.width / 2);
    const maxScroll = categoryList.scrollWidth - categoryList.clientWidth;
    categoryList.scrollLeft = Math.min(Math.max(categoryList.scrollLeft + delta, 0), maxScroll);
  }

  /* ---------- 筛选与渲染 ---------- */

  function getFilteredSites() {
    const query = state.query.trim().toLocaleLowerCase();
    let list = sites;

    if (!query) {
      if (state.category === 'recent') {
        const rank = new Map(readRecent().map((item, index) => [item.url, index]));
        list = sites.filter((site) => rank.has(site.url)).sort((a, b) => rank.get(a.url) - rank.get(b.url));
      } else if (state.category !== 'all') {
        list = sites.filter((site) => site.category === state.category);
      }
    }

    // 自定义顺序作用于除「最近访问」外的全部视图;未登记的站点按原表相对顺序殿后。
    if (state.category !== 'recent') {
      const rank = new Map(readOrder().map((url, index) => [url, index]));
      const NO_RANK = Number.MAX_SAFE_INTEGER;
      list = list.slice().sort((a, b) => (rank.get(a.url) ?? NO_RANK) - (rank.get(b.url) ?? NO_RANK));
    }

    if (!query) return list;
    return list.filter((site) =>
      [site.name, site.description, ...(site.tags || [])].join(' ').toLocaleLowerCase().includes(query)
    );
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('copy failed');
  }

  function attachCopyButton(button, site) {
    let copiedTimer;
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await copyText(site.url);
        button.dataset.copied = 'true';
        button.setAttribute('aria-label', '网址已复制');
        button.title = '网址已复制';
        showToast(`已复制 ${site.name} 的网址`);
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(() => {
          delete button.dataset.copied;
          button.setAttribute('aria-label', '复制网址');
          button.title = '复制网址';
        }, TOAST_DURATION_MS);
      } catch (_) {
        button.title = '复制失败，请手动复制';
        showToast('复制失败，请手动复制');
      }
    });
  }

  // 会话内记住自动 favicon 拉取失败的站点,避免每次渲染对同一地址重发必败请求
  // (本地 icon 由 CI 保证存在,不在此列)。
  const brokenAutoIcons = new Set();

  function createSiteCard(site, query) {
    const card = template.content.firstElementChild.cloneNode(true);
    const link = card.querySelector('.card-link');
    const avatar = card.querySelector('.site-avatar');
    const favicon = card.querySelector('.site-favicon');
    const fallback = card.querySelector('.site-fallback');
    const name = card.querySelector('.site-name');
    const description = card.querySelector('.site-description');
    const copyButton = card.querySelector('.copy-button');

    // URL 格式非法时不让 new URL 抛错中断渲染,只放弃自动 favicon。
    let iconOrigin = '';
    try {
      iconOrigin = new URL(site.url).origin;
    } catch (_) { /* 坏 URL:链接按原文输出,头像降级为首字符 */ }

    card.dataset.category = site.category;
    card.dataset.url = site.url;
    link.href = site.url;
    link.setAttribute('aria-label', `${site.name || site.url}：${site.description}（在新窗口打开）`);

    fallback.textContent = site.name.trim().slice(0, 1) || '?';
    favicon.addEventListener('error', () => {
      if (!site.icon && iconOrigin) brokenAutoIcons.add(iconOrigin);
      avatar.dataset.fallback = 'true';
    });
    if (site.icon) {
      favicon.src = site.icon;
    } else if (iconOrigin && !brokenAutoIcons.has(iconOrigin)) {
      favicon.src = `${iconOrigin}/favicon.ico`;
    } else {
      avatar.dataset.fallback = 'true';
    }

    if (recentUrlSet().has(site.url)) {
      avatar.dataset.recent = 'true';
    }

    name.innerHTML = highlightText(site.name, query);
    description.innerHTML = highlightText(site.description, query);
    // 描述被单行截断时，悬停可查看全文。
    description.title = site.description;

    link.addEventListener('click', () => {
      pushRecent(site.url);
      avatar.dataset.recent = 'true';
      updateCategoryButtons();
    });

    attachCopyButton(copyButton, site);
    return card;
  }

  function renderSites({ animate = false } = {}) {
    const filtered = getFilteredSites();
    const query = state.query.trim();
    const fragment = document.createDocumentFragment();

    filtered.forEach((site, index) => {
      const card = createSiteCard(site, query);
      if (animate && index <= STAGGER_MAX_INDEX) {
        card.style.setProperty('--delay', `${index * STAGGER_STEP_MS}ms`);
      }
      fragment.append(card);
    });
    grid.replaceChildren(fragment);
    grid.dataset.animate = animate ? 'true' : 'false';

    const categoryName = categories.find((category) => category.id === effectiveCategory())?.name;
    const countText = effectiveCategory() === 'all'
      ? `共 ${filtered.length} 个网站`
      : `${categoryName} · ${filtered.length} 个网站`;
    // 内容未变不写入,避免 aria-live 区域被高频重播
    if (resultsCount.textContent !== countText) resultsCount.textContent = countText;

    const hasFilters = Boolean(query) || state.category !== 'all';
    clearButton.hidden = !hasFilters;
    clearRecent.hidden = effectiveCategory() !== 'recent';
    resetOrder.hidden = effectiveCategory() === 'recent' || readOrder().length === 0;
    emptyState.hidden = filtered.length !== 0;
    grid.hidden = filtered.length === 0;
    // 搜索子集与「最近访问」的顺序语义特殊,不允许拖拽;单卡片无可排。
    grid.classList.toggle('is-orderable', state.category !== 'recent' && !query && filtered.length > 1);
  }

  // 拖拽排序是否可用:由 renderSites 维护 is-orderable 类。
  // 定义在键盘排序与拖拽两个使用方之前,消除对声明顺序的依赖。
  const isDragEnabled = () => grid.classList.contains('is-orderable');

  /* ---------- URL 状态同步 ---------- */

  // mode: 'push' 视图切换产生历史记录(后退可回退到上一个视图);
  // 'replace' 原地改写当前记录;'none' 状态来自历史(popstate),不回写。
  function syncUrl(mode = 'replace') {
    const params = new URLSearchParams();
    if (state.query.trim()) params.set('q', state.query.trim());
    // 搜索时分类不参与过滤,URL 也不带 cat,清空搜索后原分类自动恢复
    if (effectiveCategory() !== 'all') params.set('cat', effectiveCategory());
    const search = params.toString();
    const url = search ? `${location.pathname}?${search}${location.hash}` : `${location.pathname}${location.hash}`;
    // 状态未变不写历史,避免 resetOrder 这类无 URL 语义的操作塞入重复记录
    if (url === `${location.pathname}${location.search}${location.hash}`) return;
    try {
      if (mode === 'push') history.pushState(null, '', url);
      else if (mode === 'replace') history.replaceState(null, '', url);
    } catch (_) {
      // file:// 等场景下 history API 不可用，静默降级为仅内存状态。
    }
  }

  function readUrlState() {
    const params = new URLSearchParams(location.search);
    const cat = params.get('cat');
    state.query = params.get('q') || '';
    state.category = categories.some((category) => category.id === cat) ? cat : 'all';
    searchInput.value = state.query;
  }

  /* ---------- 状态派发 ---------- */

  // 所有可见状态变更的唯一出口：先归一化（最近记录被外部清空时回退「全部」），
  // 再按固定顺序同步输入框、分类按钮、URL 与视图。
  // 调用方只改 state,不再手工编排 syncSearchClear / updateCategoryButtons / syncUrl / renderSites 的调用序列。
  // 输入框仅在值不一致时回写,不打断输入法组词过程。
  // history: 'push'(默认,切换视图可后退) | 'replace' | 'none'(状态来自 popstate)
  function dispatchState({ animate = false, focusSearch = false, history: historyMode = 'push' } = {}) {
    if (state.category === 'recent' && readRecent().length === 0) {
      state.category = 'all';
    }
    // 一次成功的状态派发说明应用仍活着,收回此前意外亮出的错误态
    errorState.hidden = true;
    if (searchInput.value !== state.query) searchInput.value = state.query;
    syncSearchClear();
    updateCategoryButtons();
    if (historyMode !== 'none') syncUrl(historyMode);
    renderSites({ animate });
    if (focusSearch) searchInput.focus();
  }

  window.addEventListener('popstate', () => {
    clearTimeout(searchRenderTimer); // 丢弃排队的搜索渲染,以历史记录的状态为准
    readUrlState();
    dispatchState({ history: 'none' });
  });

  /* ---------- 重置筛选 ---------- */

  function resetFilters({ focus = false, animate = true } = {}) {
    state.query = '';
    state.category = 'all';
    dispatchState({ animate, focusSearch: focus });
  }

  /* ---------- 主题 ---------- */

  function updateTheme() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    themeToggle.setAttribute('aria-label', isDark ? '切换浅色模式' : '切换深色模式');
    themeColor.content = isDark ? '#1d222b' : '#f0f3f7';
  }

  function applyTheme(theme, { persist = true } = {}) {
    document.documentElement.dataset.theme = theme;
    if (persist) {
      try {
        localStorage.setItem('nav-theme', theme);
      } catch (_) {
        // 隐私模式下存储不可用时，仍可在当前页面切换主题。
      }
    }
    updateTheme();
  }

  // 带视图过渡的主题切换;persist=false 用于跟随系统/跨标签同步,不覆盖用户的选择
  function setTheme(theme, { persist = true } = {}) {
    if (typeof document.startViewTransition === 'function') {
      const viewTransition = document.startViewTransition(() => {
        // 快照拍摄期间禁用元素级过渡，避免新快照拍到「半新半旧」的混杂画面。
        document.documentElement.dataset.themeSwitching = 'true';
        applyTheme(theme, { persist });
      });
      // 动画完成或被后续切换打断（skip）时都会 settle，属性清理天然可靠。
      viewTransition.finished.finally(() => {
        delete document.documentElement.dataset.themeSwitching;
      });
    } else {
      applyTheme(theme, { persist });
    }
  }

  themeToggle.addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  // 用户未手动选过主题时,系统昼夜切换实时跟随;一旦手动切换即以用户选择为准
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  systemDark.addEventListener('change', (event) => {
    try {
      if (localStorage.getItem('nav-theme')) return;
    } catch (_) {
      return; // 存储不可用时无法区分是否手动设置过,维持现状
    }
    setTheme(event.matches ? 'dark' : 'light', { persist: false });
  });

  /* ---------- 多标签页同步 ---------- */

  // 另一个标签页改动了本地数据(storage 事件只在本页之外触发):
  // 失效会话缓存并按最新数据刷新视图;主题跟随对方的选择且不回写,避免两个标签页互相覆盖。
  window.addEventListener('storage', (event) => {
    if (event.key === RECENT_KEY || event.key === ORDER_KEY) {
      storageCache.delete(event.key);
      dispatchState({ history: 'none' });
    } else if (event.key === 'nav-theme' && (event.newValue === 'dark' || event.newValue === 'light')) {
      applyTheme(event.newValue, { persist: false });
    }
  });

  /* ---------- 搜索 ---------- */

  const isApplePlatform = /Mac|iP(hone|ad|od)/.test(navigator.platform || '');
  if (searchShortcut) {
    searchShortcut.textContent = isApplePlatform ? '⌘K' : 'Ctrl K';
  }

  function syncSearchClear() {
    searchClear.hidden = !searchInput.value;
  }

  // 搜索输入防抖:每次击键都会全量重建网格,连续输入只在停顿后渲染;
  // 清空关键词立即渲染,保证清除动作跟手。
  let searchRenderTimer = 0;

  searchInput.addEventListener('input', (event) => {
    state.query = event.target.value;
    syncSearchClear();
    clearTimeout(searchRenderTimer);
    // 输入法组词过程中不渲染,词组确认后的最终 input 事件(isComposing=false)才过滤,
    // 避免拼音每敲一个字母就全量重建一次网格
    if (event.isComposing) return;
    if (state.query.trim()) {
      searchRenderTimer = setTimeout(() => dispatchState(), SEARCH_RENDER_DELAY_MS);
    } else {
      dispatchState();
    }
  });

  // 组词提交兜底:WebKit(Safari/IOS)确认词组时的最后一次 input 事件 isComposing 仍为 true,
  // 会被上面的守卫跳过且不再有其他触发路径,这里补上过滤(Chrome 等会先到 input(false),clearTimeout 去重)
  searchInput.addEventListener('compositionend', () => {
    clearTimeout(searchRenderTimer);
    if (state.query.trim()) {
      searchRenderTimer = setTimeout(() => dispatchState(), SEARCH_RENDER_DELAY_MS);
    } else {
      dispatchState();
    }
  });

  searchInput.addEventListener('keydown', (event) => {
    if (event.isComposing) return; // Esc 优先让输入法取消组词
    if (event.key === 'Escape' && searchInput.value) {
      event.stopPropagation();
      clearTimeout(searchRenderTimer);
      state.query = '';
      dispatchState();
    }
  });

  searchClear.addEventListener('click', () => {
    clearTimeout(searchRenderTimer);
    state.query = '';
    dispatchState({ focusSearch: true });
  });

  /* ---------- 快捷键与键盘网格导航 ---------- */

  function isTypingTarget(target) {
    return target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target.isContentEditable;
  }

  function getGridColumns(links) {
    if (links.length < 2) return links.length || 1;
    // 用视口坐标而非 offsetTop:卡片的 offsetParent 是 position:relative 的卡片自身,
    // 链接的 offsetTop 恒为 0,会把列数误算成总数
    const firstTop = Math.round(links[0].getBoundingClientRect().top);
    return Math.max(1, links.filter((link) => Math.round(link.getBoundingClientRect().top) === firstTop).length);
  }

  // 聚焦搜索类快捷键:⌘K / Ctrl K 与 /
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;

    if (event.key === '/' && !isTypingTarget(target)) {
      event.preventDefault();
      searchInput.focus();
      return;
    }

    // 输入框内按 Esc 退出输入状态
    if (event.key === 'Escape' && isTypingTarget(target)) {
      target.blur();
    }
  });

  // Alt+↑/↓:对聚焦的卡片做前后微调(无鼠标场景的排序入口)
  document.addEventListener('keydown', (event) => {
    if (!event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const card = event.target instanceof Element ? event.target.closest('.site-card') : null;
    if (card && isDragEnabled()) {
      event.preventDefault();
      moveCardByKeyboard(card, event.key === 'ArrowUp' ? -1 : 1);
    }
  });

  // 方向键在卡片网格间移动焦点(按实测列数换行换列)
  document.addEventListener('keydown', (event) => {
    const arrowKeys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'];
    if (!arrowKeys.includes(event.key) || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (isTypingTarget(target)) return;

    const links = Array.from(grid.querySelectorAll('.card-link'));
    if (!links.length) return;

    const active = document.activeElement;
    const current = active && active.closest ? active.closest('.card-link') : null;
    if (!current && active !== document.body) return;

    const index = current ? links.indexOf(current) : -1;
    const columns = getGridColumns(links);
    let next = index;

    if (event.key === 'ArrowRight') next = index < 0 ? 0 : Math.min(index + 1, links.length - 1);
    if (event.key === 'ArrowLeft') next = index < 0 ? links.length - 1 : Math.max(index - 1, 0);
    if (event.key === 'ArrowDown') next = index < 0 ? 0 : Math.min(index + columns, links.length - 1);
    if (event.key === 'ArrowUp') next = index < 0 ? 0 : Math.max(index - columns, 0);

    if (next === index) return;
    event.preventDefault();
    links[next].focus();
  });

  /* ---------- 拖拽排序 ---------- */

  const drag = {
    active: false,
    pointerId: null,
    card: null,
    cards: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    offsetX: 0,
    offsetY: 0,
    appliedX: 0,
    appliedY: 0,
    longPressTimer: 0,
    fromIndex: -1,
    index: -1,
    rects: [],
    scrollY: 0,
    suppressClick: false,
  };

  function cleanupDragListeners() {
    window.removeEventListener('pointermove', onDragPointerMove);
    window.removeEventListener('pointerup', onDragPointerUp);
    window.removeEventListener('pointercancel', onDragPointerCancel);
    window.removeEventListener('scroll', onDragScroll);
    document.removeEventListener('touchmove', preventTouchScroll);
  }

  function resetDragState() {
    drag.active = false;
    drag.pointerId = null;
    drag.card = null;
    drag.cards = null;
    drag.fromIndex = -1;
    drag.index = -1;
  }

  function preventTouchScroll(event) {
    if (drag.active) event.preventDefault();
  }

  // 拖拽期间页面滚动会让按视口坐标记录的槽位失效,跟随滚动量整体平移修正。
  function onDragScroll() {
    if (!drag.active) return;
    const dy = window.scrollY - drag.scrollY;
    if (!dy) return;
    drag.rects = drag.rects.map((rect) => ({ ...rect, top: rect.top + dy, bottom: rect.bottom + dy }));
    drag.scrollY = window.scrollY;
  }

  grid.addEventListener('pointerdown', (event) => {
    if (!isDragEnabled() || drag.active || event.button > 0) return;
    if (event.target.closest('.copy-button')) return;
    const card = event.target.closest('.site-card');
    if (!card) return;
    drag.pointerId = event.pointerId;
    drag.card = card;
    drag.startX = event.clientX;
    drag.startY = event.clientY;
    drag.suppressClick = false;
    // 鼠标按住后位移超阈值即拖;触屏先长按,期间滑动手势让路给滚动。
    if (event.pointerType === 'touch') {
      drag.longPressTimer = setTimeout(() => activateDrag(event.clientX, event.clientY), LONG_PRESS_MS);
    }
    window.addEventListener('pointermove', onDragPointerMove);
    window.addEventListener('pointerup', onDragPointerUp);
    window.addEventListener('pointercancel', onDragPointerCancel);
    window.addEventListener('scroll', onDragScroll, { passive: true });
  });

  function activateDrag(x, y) {
    const cards = [...grid.querySelectorAll('.site-card')];
    if (cards.length < 2) { cancelPendingDrag(); return; }
    clearTimeout(drag.longPressTimer);
    drag.active = true;
    // 缓存拖前的卡片数组:松手时要以此数组和起点/终点索引计算全局顺序,
    // 因为拖拽过程中 DOM 已被 FLIP 交换,实时查询会拿错站点。
    drag.cards = cards;
    drag.rects = cards.map((card) => card.getBoundingClientRect());
    drag.fromIndex = cards.indexOf(drag.card);
    drag.index = drag.fromIndex;
    const rect = drag.rects[drag.fromIndex];
    drag.offsetX = x - rect.left;
    drag.offsetY = y - rect.top;
    drag.appliedX = 0;
    drag.appliedY = 0;
    drag.lastX = x;
    drag.lastY = y;
    drag.scrollY = window.scrollY;
    drag.suppressClick = true;
    drag.card.classList.add('is-dragging');
    grid.classList.add('is-ordering');
    try { drag.card.setPointerCapture(drag.pointerId); } catch (_) { /* 捕获失败不阻断拖拽 */ }
    document.addEventListener('touchmove', preventTouchScroll, { passive: false });
    positionDragged();
  }

  function cancelPendingDrag() {
    clearTimeout(drag.longPressTimer);
    cleanupDragListeners();
    resetDragState();
  }

  function onDragPointerMove(event) {
    if (event.pointerId !== drag.pointerId || !drag.card) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.active) {
      if (event.pointerType === 'touch') {
        // 触屏位移超过阈值视为滚动手势,取消待触发的长按拖拽
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD_TOUCH_PX) cancelPendingDrag();
        return;
      }
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_MOUSE_PX) activateDrag(event.clientX, event.clientY);
      return;
    }
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    positionDragged();
    moveDraggedTo(hitTestSlot(drag.lastX, drag.lastY));
  }

  function positionDragged() {
    const rect = drag.card.getBoundingClientRect();
    // rect 含当前 transform,先还原出布局位置,再计算指向目标位置所需位移
    const baseLeft = rect.left - drag.appliedX;
    const baseTop = rect.top - drag.appliedY;
    drag.appliedX = drag.lastX - drag.offsetX - baseLeft;
    drag.appliedY = drag.lastY - drag.offsetY - baseTop;
    drag.card.style.transform = `translate(${drag.appliedX}px, ${drag.appliedY}px)`;
  }

  // 以卡片中心的最近槽位为目标,天然兼容多列网格。
  function hitTestSlot(x, y) {
    let best = drag.index;
    let bestDist = Infinity;
    drag.rects.forEach((rect, index) => {
      const dist = (x - (rect.left + rect.width / 2)) ** 2 + (y - (rect.top + rect.height / 2)) ** 2;
      if (dist < bestDist) { bestDist = dist; best = index; }
    });
    return best;
  }

  function moveDraggedTo(target) {
    if (target === drag.index) return;
    const cards = [...grid.querySelectorAll('.site-card')];
    const anchor = cards[target];
    if (!anchor) return;
    const siblings = cards.filter((card) => card !== drag.card);
    // 先清掉上一轮 FLIP 的位移,以布局位置为基准计算本轮反演
    siblings.forEach((card) => {
      card.style.transition = 'none';
      card.style.transform = '';
    });
    void grid.offsetWidth;
    const before = new Map(siblings.map((card) => [card, card.getBoundingClientRect()]));
    if (target > drag.index) anchor.after(drag.card);
    else anchor.before(drag.card);
    drag.index = target;
    siblings.forEach((card) => {
      const first = before.get(card);
      const last = card.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      if (dx || dy) {
        card.style.transition = 'none';
        card.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    });
    void grid.offsetWidth;
    siblings.forEach((card) => {
      card.style.transition = '';
      if (card.style.transform) {
        requestAnimationFrame(() => { card.style.transform = ''; });
      }
    });
    positionDragged();
  }

  function onDragPointerUp(event) {
    if (event.pointerId !== drag.pointerId) return;
    const wasActive = drag.active;
    clearTimeout(drag.longPressTimer);
    cleanupDragListeners();
    if (!wasActive) { resetDragState(); return; }
    if (drag.index !== drag.fromIndex) {
      reorderGlobal(drag.cards, drag.fromIndex, drag.index);
      resetOrder.hidden = readOrder().length === 0;
    }
    finishDrag();
  }

  function onDragPointerCancel(event) {
    if (event.pointerId !== drag.pointerId) return;
    clearTimeout(drag.longPressTimer);
    cleanupDragListeners();
    if (drag.active) renderSites(); // 丢弃拖拽中的视觉重排,以存储顺序为准
    finishDrag();
  }

  function finishDrag() {
    if (drag.card) {
      drag.card.classList.remove('is-dragging');
      drag.card.style.transform = '';
    }
    grid.classList.remove('is-ordering');
    resetDragState();
  }

  function moveCardByKeyboard(card, delta) {
    const cards = [...grid.querySelectorAll('.site-card')];
    const from = cards.indexOf(card);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= cards.length) return;
    reorderGlobal(cards, from, to);
    renderSites();
    grid.querySelectorAll('.site-card')[to]?.querySelector('.card-link')?.focus();
    // 排序结果对读屏用户零宣告,用全局 toast(aria-live)补充确认
    showToast(`已移动到第 ${to + 1} 位`);
  }

  // 拖拽激活过的手势,释放时的一次 click 不应打开站点
  grid.addEventListener('click', (event) => {
    if (!drag.suppressClick) return;
    drag.suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  grid.addEventListener('contextmenu', (event) => {
    if (drag.active) event.preventDefault();
  });

  resetOrder.addEventListener('click', () => {
    writeOrder([]);
    dispatchState({ animate: true });
    showToast('已恢复默认排序');
  });

  clearButton.addEventListener('click', () => resetFilters({ focus: true }));
  emptyReset.addEventListener('click', () => resetFilters({ focus: true }));

  clearRecent.addEventListener('click', () => {
    clearStoredList(RECENT_KEY);
    state.category = 'all';
    dispatchState({ animate: true });
    showToast('已清除最近访问记录');
  });

  /* ---------- 回到顶部 ---------- */

  function syncScrollState() {
    // 阈值随视口高度走:固定值在小屏(横屏手机)要滚过一整屏才出现,大屏又永远够不到;
    // 再与可滚动范围的 60% 取小,避免内容不足一屏时按钮永远够不到阈值。
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    backToTop.classList.toggle('is-visible', window.scrollY > Math.min(window.innerHeight * SCROLL_TOP_RATIO, maxScroll * SCROLL_TOP_RATIO));
    // sticky 元素的 offsetTop 会随吸顶位置移动，不能作阈值；用 main 的文档位置（搜索条的自然位置）。
    // 头部并入搜索行后 main.offsetTop≈0,至少滚过 1px 才算吸顶,避免加载即 is-stuck。
    controls.classList.toggle('is-stuck', window.scrollY >= Math.max(mainEl.offsetTop, 1));
  }

  window.addEventListener('scroll', syncScrollState, { passive: true });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- 全局错误兜底 ---------- */

  // 渲染链路意外抛错时给出可见提示,避免静默白屏(noscript 只覆盖无 JS 场景)。
  // 资源加载失败(error 不冒泡到 window)与已捕获的 Promise 不经过这里。
  function showErrorState() {
    if (!errorState.hidden) return;
    grid.hidden = true;
    emptyState.hidden = true;
    errorState.hidden = false;
  }
  window.addEventListener('error', showErrorState);
  window.addEventListener('unhandledrejection', showErrorState);

  /* ---------- PWA ---------- */

  // 注册 Service Worker(离线缓存/添加到主屏);失败场景(file://、受限环境)静默降级为在线使用
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  /* ---------- 启动 ---------- */

  readUrlState();
  createCategoryButtons();
  dispatchState({ animate: true });
  updateTheme();
  syncScrollState();
})();
