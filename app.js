(() => {
  'use strict';

  const sites = Array.isArray(window.NAV_SITES) ? window.NAV_SITES : [];
  const categories = [
    { id: 'all', name: '全部' },
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
  const categoryList = document.querySelector('#category-list');
  const resultsCount = document.querySelector('#results-count');
  const clearButton = document.querySelector('#clear-button');
  const emptyState = document.querySelector('#empty-state');
  const emptyReset = document.querySelector('#empty-reset');
  const themeToggle = document.querySelector('#theme-toggle');
  const themeColor = document.querySelector('meta[name="theme-color"]');

  document.querySelector('#site-total').textContent = sites.length;
  document.querySelector('#current-year').textContent = new Date().getFullYear();

  function createCategoryButtons() {
    categories.forEach((category) => {
      const count = category.id === 'all'
        ? sites.length
        : sites.filter((site) => site.category === category.id).length;
      const button = document.createElement('button');
      button.className = 'category-button';
      button.type = 'button';
      button.dataset.category = category.id;
      button.setAttribute('aria-pressed', String(state.category === category.id));
      button.setAttribute('aria-label', `${category.name}，${count} 个网站`);

      const name = document.createElement('span');
      name.textContent = category.name;
      const countLabel = document.createElement('span');
      countLabel.className = 'category-count';
      countLabel.textContent = count;
      button.append(name, countLabel);

      button.addEventListener('click', () => {
        state.category = category.id;
        updateCategoryButtons();
        renderSites();
      });
      categoryList.append(button);
    });
  }

  function updateCategoryButtons() {
    categoryList.querySelectorAll('.category-button').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.category === state.category));
    });
  }

  function getFilteredSites() {
    const query = state.query.trim().toLocaleLowerCase();
    return sites.filter((site) => {
      const inCategory = state.category === 'all' || site.category === state.category;
      if (!inCategory) return false;
      if (!query) return true;
      const searchable = [site.name, site.description, ...(site.tags || [])].join(' ').toLocaleLowerCase();
      return searchable.includes(query);
    });
  }

  function createSiteCard(site) {
    const card = template.content.firstElementChild.cloneNode(true);
    const link = card.querySelector('.card-link');
    const avatar = card.querySelector('.site-avatar');
    const name = card.querySelector('.site-name');
    const description = card.querySelector('.site-description');
    const domain = card.querySelector('.site-domain');
    const hostname = new URL(site.url).hostname.replace(/^www\./, '');

    card.dataset.category = site.category;
    link.href = site.url;
    link.setAttribute('aria-label', `${site.name}：${site.description}（在新窗口打开）`);
    avatar.textContent = site.name.trim().slice(0, 1).toUpperCase();
    name.textContent = site.name;
    description.textContent = site.description;
    domain.textContent = hostname;
    return card;
  }

  function renderSites() {
    const filtered = getFilteredSites();
    const fragment = document.createDocumentFragment();
    filtered.forEach((site) => fragment.append(createSiteCard(site)));
    grid.replaceChildren(fragment);

    const categoryName = categories.find((category) => category.id === state.category)?.name;
    resultsCount.textContent = state.category === 'all'
      ? `共 ${filtered.length} 个网站`
      : `${categoryName} · ${filtered.length} 个网站`;
    const hasFilters = Boolean(state.query.trim()) || state.category !== 'all';
    clearButton.hidden = !hasFilters;
    emptyState.hidden = filtered.length !== 0;
    grid.hidden = filtered.length === 0;
  }

  function resetFilters({ focus = false } = {}) {
    state.query = '';
    state.category = 'all';
    searchInput.value = '';
    updateCategoryButtons();
    renderSites();
    if (focus) searchInput.focus();
  }

  function updateTheme() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    themeToggle.setAttribute('aria-label', isDark ? '切换浅色模式' : '切换深色模式');
    themeColor.content = isDark ? '#101318' : '#f6f7f9';
  }

  searchInput.addEventListener('input', (event) => {
    state.query = event.target.value;
    renderSites();
  });

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && searchInput.value) {
      event.stopPropagation();
      state.query = '';
      searchInput.value = '';
      renderSites();
    }
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const isTyping = target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target.isContentEditable;
    if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      searchInput.focus();
    }
  });

  clearButton.addEventListener('click', () => resetFilters({ focus: true }));
  emptyReset.addEventListener('click', () => resetFilters({ focus: true }));

  themeToggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    try {
      localStorage.setItem('nav-theme', nextTheme);
    } catch (_) {
      // 隐私模式下存储不可用时，仍可在当前页面切换主题。
    }
    updateTheme();
  });

  createCategoryButtons();
  renderSites();
  updateTheme();
})();
