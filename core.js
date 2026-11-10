// 纯函数核心(零 DOM/存储依赖):app.js 与 node:test 单测(tests/core.test.mjs)共用。
// 双端挂载:浏览器暴露 window.NAV_CORE,node 暴露 module.exports。
(function (global) {
  'use strict';

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

  // 把可见视图内 from→to 的移动映射回全局顺序:以目标位的可见项为锚点插入,
  // 夹在两者之间、未在本视图显示的站点保持原有邻接关系。
  // 纯函数:order 为已持久化的顺序,siteUrls 为现存站点 URL 列表;
  // insertBefore=true 插到锚点前(to < from 的移动),false 插到锚点后。无法定位锚点返回 null。
  function computeReorderedOrder({ order, siteUrls, moved, neighbor, insertBefore }) {
    const known = new Set(order);
    const fullOrder = [...order, ...siteUrls.filter((url) => !known.has(url))];
    const rest = fullOrder.filter((url) => url !== moved);
    const at = rest.indexOf(neighbor);
    if (at === -1) return null;
    return insertBefore
      ? [...rest.slice(0, at), moved, ...rest.slice(at)]
      : [...rest.slice(0, at + 1), moved, ...rest.slice(at + 1)];
  }

  const api = { escapeHtml, highlightText, normalizeSites, computeReorderedOrder };
  global.NAV_CORE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
