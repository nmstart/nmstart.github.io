// core.js 纯函数单测(node:test,零依赖,与 CI/pre-commit 共用)。
// 覆盖历史上最容易回归的四块:HTML 转义、搜索高亮、数据容错、拖拽排序的锚点映射。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// core.js 是浏览器优先的 CJS 双端文件,经 createRequire 加载
const { escapeHtml, highlightText, normalizeSites, computeReorderedOrder } = createRequire(import.meta.url)('../core.js');

test('escapeHtml 转义全部 HTML 特殊字符', () => {
  assert.equal(escapeHtml('<a href="x">&\''), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  assert.equal(escapeHtml('正常文本'), '正常文本');
  assert.equal(escapeHtml(42), '42');
});

test('highlightText 命中片段包 mark 且整体转义安全', () => {
  const out = highlightText('GitHub 代码托管', 'git');
  assert.equal(out, '<mark>Git</mark>Hub 代码托管');
});

test('highlightText 对命中片段内的 HTML 特殊字符转义', () => {
  const out = highlightText('<b>bold</b>', 'b');
  // 命中只发生在真实的 b 上,标签符号按原文转义;不能因先转义而把 &lt; 里的 lt 当关键词
  assert.equal(out, '&lt;<mark>b</mark>&gt;<mark>b</mark>old&lt;/<mark>b</mark>&gt;');
});

test('highlightText 把正则元字符当普通文本', () => {
  assert.equal(highlightText('a.c (x)', '.'), 'a<mark>.</mark>c (x)');
  assert.equal(highlightText('a.c (x)', '('), 'a.c <mark>(</mark>x)');
});

test('highlightText 空关键词原样转义返回', () => {
  assert.equal(highlightText('<script>', '  '), '&lt;script&gt;');
});

test('normalizeSites 剔除无 URL 记录并补默认值', () => {
  const out = normalizeSites([
    { url: 'https://a.com' },
    null,
    { name: '坏记录' },
    { url: 'https://b.com', name: 'B', tags: ['x', 1, null], icon: 42 },
  ]);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], { url: 'https://a.com', name: '', description: '', tags: [], icon: '' });
  assert.deepEqual(out[1].tags, ['x']);
  assert.equal(out[1].icon, '');
});

test('normalizeSites 非数组输入返回空', () => {
  assert.deepEqual(normalizeSites(undefined), []);
  assert.deepEqual(normalizeSites({}), []);
});

test('computeReorderedOrder 向后移动插到锚点之后', () => {
  const next = computeReorderedOrder({
    order: ['a', 'b', 'c'], siteUrls: ['a', 'b', 'c'], moved: 'a', neighbor: 'c', insertBefore: false,
  });
  assert.deepEqual(next, ['b', 'c', 'a']);
});

test('computeReorderedOrder 向前移动插到锚点之前', () => {
  const next = computeReorderedOrder({
    order: ['a', 'b', 'c'], siteUrls: ['a', 'b', 'c'], moved: 'c', neighbor: 'a', insertBefore: true,
  });
  assert.deepEqual(next, ['c', 'a', 'b']);
});

test('computeReorderedOrder 未登记站点按原表顺序殿后', () => {
  const next = computeReorderedOrder({
    order: ['a'], siteUrls: ['a', 'b', 'c'], moved: 'a', neighbor: 'c', insertBefore: false,
  });
  assert.deepEqual(next, ['b', 'c', 'a']);
});

test('computeReorderedOrder 锚点不存在返回 null', () => {
  const next = computeReorderedOrder({
    order: ['a'], siteUrls: ['a'], moved: 'a', neighbor: 'ghost', insertBefore: true,
  });
  assert.equal(next, null);
});
