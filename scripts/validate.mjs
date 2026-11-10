// 站点数据与静态资源的一致性校验。
// CI(ci.yml)与本地 pre-commit 钩子共用本脚本,保证「本地能过的,CI 必过」。
// 校验项:
//   1. manifest.json 可解析,声明的图标文件都存在,sw.js 存在
//   2. sites.js 引用的 icon 文件都存在;磁盘上未被引用的图标仅提示
//   3. 站点数据卫生:字段合法、分类引用存在、URL 协议为 http/https、无重复 URL
import fs from 'node:fs';

let failed = false;
const fail = (message) => {
  console.error(message);
  failed = true;
};

/* ---------- manifest 与 PWA 资源 ---------- */

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
// 保留 './' 前缀,与 sites.js 中 icon 字段的书写形式一致,referenced 集合才能正确去重
const manifestIcons = manifest.icons.map((icon) => icon.src);
for (const iconPath of manifestIcons) {
  if (!fs.existsSync(iconPath)) fail(`manifest 图标缺失: ${iconPath}`);
}
if (!fs.existsSync('sw.js')) fail('缺少 sw.js');
console.log(`manifest 校验通过: ${manifestIcons.length} 个图标`);

/* ---------- og:image 资源 ---------- */

const html = fs.readFileSync('index.html', 'utf8');
const ogMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
if (!ogMatch) {
  fail('index.html 缺少 og:image');
} else {
  const ogPath = ogMatch[1].replace(/^https:\/\/nmstart\.github\.io\//, '');
  if (!fs.existsSync(ogPath)) fail(`og:image 资源缺失: ${ogPath}`);
  else console.log(`og:image 校验通过: ${ogPath}`);
}

/* ---------- sites.js 图标引用完整性 ---------- */

const src = fs.readFileSync('sites.js', 'utf8');
const siteIcons = [...src.matchAll(/icon:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
if (!siteIcons.length) {
  fail('sites.js 中未找到 icon 字段');
} else {
  const missing = siteIcons.filter((iconPath) => !fs.existsSync(iconPath));
  if (missing.length) fail(`缺失图标文件: ${missing.join(', ')}`);
  const referenced = new Set([...siteIcons, ...manifestIcons]);
  const orphans = fs.readdirSync('assets/icons').filter((file) => !referenced.has(`./assets/icons/${file}`));
  if (orphans.length) console.warn('未被引用的图标(仅提示):', orphans.join(', '));
  console.log(`icon 引用完整: ${siteIcons.length} 个`);
}

/* ---------- 站点数据卫生 ---------- */

globalThis.window = {};
await import('../sites.js');
const categories = globalThis.window.NAV_CATEGORIES;
const sites = globalThis.window.NAV_SITES;

if (!Array.isArray(categories) || !categories.length) {
  fail('sites.js 未定义 NAV_CATEGORIES');
} else if (!Array.isArray(sites) || !sites.length) {
  fail('sites.js 未定义 NAV_SITES');
} else {
  // 分类白名单以数据文件的 NAV_CATEGORIES 为单一事实来源,不与 app.js 双份维护
  const valid = new Set(categories.map((category) => category.id));
  if (valid.size !== categories.length) fail('分类 id 存在重复');
  for (const category of categories) {
    if (!category || typeof category.id !== 'string' || !category.id
      || typeof category.name !== 'string' || !category.name) {
      fail(`分类定义不合法: ${JSON.stringify(category)}`);
    }
  }
  const urls = new Set();
  for (const site of sites) {
    if (!site || typeof site.name !== 'string' || !site.name.trim()
      || typeof site.url !== 'string' || !site.url.trim()
      || typeof site.description !== 'string' || !site.description.trim()) {
      fail(`记录字段不合法: ${site && site.name}`);
    } else if (!valid.has(site.category)) {
      fail(`未知分类: ${site.name} → ${site.category}`);
    } else if (!/^https?:\/\//i.test(site.url)) {
      // 只放行 http/https,拦截 javascript: 等协议进入 href
      fail(`URL 协议须为 http/https: ${site.url}`);
    } else if (site.tags !== undefined && !Array.isArray(site.tags)) {
      fail(`tags 须为数组: ${site.name}`);
    }
    if (urls.has(site.url)) fail(`URL 重复: ${site.url}`);
    urls.add(site.url);
  }
  console.log(`站点数据通过: ${sites.length} 条, ${valid.size} 个分类`);
}

if (failed) process.exit(1);
