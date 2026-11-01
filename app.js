(() => {
  'use strict';

  const RECENT_KEY = 'nav-recent-visits';
  const RECENT_LIMIT = 12;
  const STAGGER_STEP_MS = 35;
  const STAGGER_MAX_INDEX = 11;

  const sites = Array.isArray(window.NAV_SITES) ? window.NAV_SITES : [];
  const categories = [
    { id: 'all', name: '全部' },
    { id: 'recent', name: '最近访问' },
    { id: 'dev', name: '开发工具' },
    { id: 'ai', name: '人工智能' },
    { id: 'design', name: '设计资源' },
    { id: 'learn', name: '学习成长' },
    { id: 'productivity', name: '效率工具' },
    { id: 'discover', name: '发现资讯' },
  ];

  const state = { query: '', category: 'all' };
  const grid = document.querySelector('#site-grid');
  const template = document.querySelector('#site-card-template');
  const searchInput = document.querySelector('#search-input');
  const searchClear = document.querySelector('#search-clear');
  const categoryList = document.querySelector('#category-list');
  const resultsCount = document.querySelector('#results-count');
  const clearButton = document.querySelector('#clear-button');
  const emptyState = document.querySelector('#empty-state');
  const emptyReset = document.querySelector('#empty-reset');
  const themeToggle = document.querySelector('#theme-toggle');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const backToTop = document.querySelector('#back-to-top');
  const toast = document.querySelector('#toast');
  const searchShortcut = document.querySelector('#search-shortcut');

  document.querySelector('#current-year').textContent = new Date().getFullYear();

  /* ---------- 工具 ---------- */

  const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
  }

  function highlightText(text, query) {
    const safe = escapeHtml(text);
    const keyword = query.trim();
    if (!keyword) return safe;
    const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp(pattern, 'gi'), (match) => `<mark>${match}</mark>`);
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
      }, 200);
    }, 1600);
  }

  /* ---------- 最近访问 ---------- */

  function readRecent() {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.filter((item) => item && typeof item.url === 'string') : [];
    } catch (_) {
      return [];
    }
  }

  function pushRecent(url) {
    try {
      const list = readRecent().filter((item) => item.url !== url);
      list.unshift({ url, t: Date.now() });
      localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_LIMIT)));
    } catch (_) {
      // 存储不可用时静默降级：不影响本次访问记录之外的功能。
    }
  }

  const recentUrlSet = () => new Set(readRecent().map((item) => item.url));

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
      const countLabel = document.createElement('span');
      countLabel.className = 'category-count';
      button.append(name, countLabel);

      button.addEventListener('click', () => {
        if (state.category === category.id) return;
        state.category = category.id;
        updateCategoryButtons();
        syncUrl();
        renderSites({ animate: true });
      });
      categoryList.append(button);
    });
    categoryList.append(tabIndicator);
    updateCategoryButtons();
  }

  function updateCategoryButtons() {
    categoryList.querySelectorAll('.category-button').forEach((button) => {
      const id = button.dataset.category;
      const count = countForCategory(id);
      button.setAttribute('aria-pressed', String(id === state.category));
      button.setAttribute('aria-label', `${categories.find((c) => c.id === id).name}，${count} 个网站`);
      const countLabel = button.querySelector('.category-count');
      if (countLabel) countLabel.textContent = count;
      // 「最近访问」在没有记录时不占位。
      button.hidden = id === 'recent' && count === 0;
    });
    syncIndicator();
  }

  /* ---------- 分类下划线指示条 ---------- */

  const tabIndicator = document.createElement('span');
  tabIndicator.className = 'tab-indicator';
  tabIndicator.setAttribute('aria-hidden', 'true');
  let indicatorPositioned = false;

  function syncIndicator() {
    categoryList.classList.toggle('has-overflow', categoryList.scrollWidth > categoryList.clientWidth + 1);
    const active = categoryList.querySelector('.category-button[aria-pressed="true"]:not([hidden])');
    if (!active) {
      tabIndicator.style.opacity = '0';
      return;
    }
    // 首次对位不播放滑动动画，避免从 (0,0) 飞入。
    if (!indicatorPositioned) {
      tabIndicator.style.transition = 'none';
    }
    tabIndicator.style.opacity = '1';
    tabIndicator.style.width = `${active.offsetWidth}px`;
    tabIndicator.style.transform = `translateX(${active.offsetLeft}px)`;
    if (!indicatorPositioned) {
      void tabIndicator.offsetWidth;
      tabIndicator.style.transition = '';
      indicatorPositioned = true;
    }
  }

  const categoryListObserver = new ResizeObserver(() => syncIndicator());
  categoryListObserver.observe(categoryList);

  /* ---------- 筛选与渲染 ---------- */

  function getFilteredSites() {
    const query = state.query.trim().toLocaleLowerCase();
    let list = sites;

    if (state.category === 'recent') {
      const rank = new Map(readRecent().map((item, index) => [item.url, index]));
      list = sites.filter((site) => rank.has(site.url)).sort((a, b) => rank.get(a.url) - rank.get(b.url));
    } else if (state.category !== 'all') {
      list = sites.filter((site) => site.category === state.category);
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
        }, 1600);
      } catch (_) {
        button.title = '复制失败，请手动复制';
        showToast('复制失败，请手动复制');
      }
    });
  }

  function createSiteCard(site, query) {
    const card = template.content.firstElementChild.cloneNode(true);
    const link = card.querySelector('.card-link');
    const avatar = card.querySelector('.site-avatar');
    const favicon = card.querySelector('.site-favicon');
    const fallback = card.querySelector('.site-fallback');
    const name = card.querySelector('.site-name');
    const description = card.querySelector('.site-description');
    const copyButton = card.querySelector('.copy-button');

    card.dataset.category = site.category;
    link.href = site.url;
    link.setAttribute('aria-label', `${site.name}：${site.description}（在新窗口打开）`);

    fallback.textContent = site.name.trim().slice(0, 1) || '?';
    favicon.addEventListener('error', () => {
      avatar.dataset.fallback = 'true';
    });
    favicon.src = site.icon || `${new URL(site.url).origin}/favicon.ico`;

    if (recentUrlSet().has(site.url)) {
      avatar.dataset.recent = 'true';
    }

    name.innerHTML = highlightText(site.name, query);
    description.innerHTML = highlightText(site.description, query);

    link.addEventListener('click', () => {
      pushRecent(site.url);
      avatar.dataset.recent = 'true';
      updateCategoryButtons();
    });

    attachCopyButton(copyButton, site);
    return card;
  }

  function renderSites({ animate = false } = {}) {
    // 最近访问记录被外部清空时，回退到「全部」。
    if (state.category === 'recent' && readRecent().length === 0) {
      state.category = 'all';
    }
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

    const categoryName = categories.find((category) => category.id === state.category)?.name;
    resultsCount.textContent = state.category === 'all'
      ? `共 ${filtered.length} 个网站`
      : `${categoryName} · ${filtered.length} 个网站`;

    const hasFilters = Boolean(query) || state.category !== 'all';
    clearButton.hidden = !hasFilters;
    emptyState.hidden = filtered.length !== 0;
    grid.hidden = filtered.length === 0;
    updateCategoryButtons();
  }

  /* ---------- URL 状态同步 ---------- */

  function syncUrl() {
    const params = new URLSearchParams();
    if (state.query.trim()) params.set('q', state.query.trim());
    if (state.category !== 'all') params.set('cat', state.category);
    const search = params.toString();
    try {
      history.replaceState(null, '', search ? `${location.pathname}?${search}${location.hash}` : `${location.pathname}${location.hash}`);
    } catch (_) {
      // file:// 等场景下 replaceState 不可用，静默降级为仅内存状态。
    }
  }

  function readUrlState() {
    const params = new URLSearchParams(location.search);
    const cat = params.get('cat');
    state.query = params.get('q') || '';
    state.category = categories.some((category) => category.id === cat) ? cat : 'all';
    searchInput.value = state.query;
  }

  window.addEventListener('popstate', () => {
    readUrlState();
    updateCategoryButtons();
    syncSearchClear();
    renderSites();
  });

  /* ---------- 重置筛选 ---------- */

  function resetFilters({ focus = false, animate = true } = {}) {
    state.query = '';
    state.category = 'all';
    searchInput.value = '';
    syncSearchClear();
    updateCategoryButtons();
    syncUrl();
    renderSites({ animate });
    if (focus) searchInput.focus();
  }

  /* ---------- 主题 ---------- */

  function updateTheme() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    themeToggle.setAttribute('aria-label', isDark ? '切换浅色模式' : '切换深色模式');
    themeColor.content = isDark ? '#101318' : '#f6f7f9';
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('nav-theme', theme);
    } catch (_) {
      // 隐私模式下存储不可用时，仍可在当前页面切换主题。
    }
    updateTheme();
  }

  themeToggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    if (typeof document.startViewTransition === 'function') {
      document.startViewTransition(() => applyTheme(nextTheme));
    } else {
      applyTheme(nextTheme);
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

  searchInput.addEventListener('input', (event) => {
    state.query = event.target.value;
    syncSearchClear();
    syncUrl();
    renderSites();
  });

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && searchInput.value) {
      event.stopPropagation();
      state.query = '';
      searchInput.value = '';
      syncSearchClear();
      syncUrl();
      renderSites();
    }
  });

  searchClear.addEventListener('click', () => {
    state.query = '';
    searchInput.value = '';
    syncSearchClear();
    syncUrl();
    renderSites();
    searchInput.focus();
  });

  /* ---------- 快捷键与键盘网格导航 ---------- */

  function isTypingTarget(target) {
    return target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target.isContentEditable;
  }

  function getGridColumns(links) {
    if (links.length < 2) return links.length || 1;
    const firstTop = links[0].offsetTop;
    return Math.max(1, links.filter((link) => link.offsetTop === firstTop).length);
  }

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

    if (event.key === 'Escape' && isTypingTarget(target)) {
      target.blur();
      return;
    }

    const arrowKeys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'];
    if (!arrowKeys.includes(event.key) || isTypingTarget(target)) return;

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

  clearButton.addEventListener('click', () => resetFilters({ focus: true }));
  emptyReset.addEventListener('click', () => resetFilters({ focus: true }));

  /* ---------- 回到顶部 ---------- */

  function syncBackToTop() {
    backToTop.classList.toggle('is-visible', window.scrollY > 400);
  }

  window.addEventListener('scroll', syncBackToTop, { passive: true });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- 启动 ---------- */

  readUrlState();
  createCategoryButtons();
  syncSearchClear();
  renderSites({ animate: true });
  updateTheme();
  syncBackToTop();
})();
