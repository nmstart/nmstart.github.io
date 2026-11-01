// 手动维护此列表即可。category 可选：dev、ai、design、learn、productivity、discover。
// icon 指向本地持久化图标；新增网站时可省略，加载时会自动尝试在线获取并降级为首字符。
window.NAV_SITES = [
  // 开发工具
  { name: 'GitHub', url: 'https://github.com/', category: 'dev', description: '代码托管、协作开发与开源项目社区。', tags: ['代码', '开源', 'Git'], icon: './assets/icons/github.svg' },
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/zh-CN/', category: 'dev', description: '权威、详尽的 Web 开发技术文档。', tags: ['前端', '文档', 'JavaScript'], icon: './assets/icons/developer.mozilla.org.png' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com/', category: 'dev', description: '面向开发者的编程问答与知识社区。', tags: ['问答', '编程', '社区'], icon: './assets/icons/stackoverflow.svg' },
  { name: 'Vite', url: 'https://vite.dev/', category: 'dev', description: '快速、轻量的现代前端构建工具。', tags: ['构建', '前端', '工具'], icon: './assets/icons/vite.svg' },

  // 人工智能
  { name: 'Claude', url: 'https://claude.ai/', category: 'ai', description: '擅长长文本、分析与编程的 AI 助手。', tags: ['对话', '分析', '编程'], icon: './assets/icons/anthropic.svg' },
  { name: 'Gemini', url: 'https://gemini.google.com/', category: 'ai', description: 'Google 推出的多模态 AI 助手。', tags: ['多模态', '搜索', '助手'], icon: './assets/icons/googlegemini.svg' },
  { name: 'DeepSeek', url: 'https://chat.deepseek.com/', category: 'ai', description: '支持推理、问答与编程的 AI 助手。', tags: ['推理', '编程', '国产'], icon: './assets/icons/deepseek.svg' },
  { name: 'Hugging Face', url: 'https://huggingface.co/', category: 'ai', description: '机器学习模型、数据集与应用社区。', tags: ['模型', '数据集', '开源'], icon: './assets/icons/huggingface.svg' },

  // 设计资源
  { name: 'Figma', url: 'https://www.figma.com/', category: 'design', description: '在线界面设计与实时协作平台。', tags: ['UI', '原型', '协作'], icon: './assets/icons/figma.com.png' },
  { name: 'Dribbble', url: 'https://dribbble.com/', category: 'design', description: '发现界面、插画与品牌设计灵感。', tags: ['灵感', 'UI', '作品'], icon: './assets/icons/dribbble.svg' },
  { name: 'Behance', url: 'https://www.behance.net/', category: 'design', description: '展示与探索全球创意作品集。', tags: ['作品集', '创意', '灵感'], icon: './assets/icons/behance.svg' },
  { name: 'Unsplash', url: 'https://unsplash.com/', category: 'design', description: '高质量、可免费使用的摄影图片库。', tags: ['图片', '摄影', '素材'], icon: './assets/icons/unsplash.com.png' },
  { name: 'Iconify', url: 'https://iconify.design/', category: 'design', description: '统一使用海量开源图标集。', tags: ['图标', 'SVG', '开源'], icon: './assets/icons/iconify.design.png' },

  // 学习成长
  { name: 'freeCodeCamp', url: 'https://www.freecodecamp.org/', category: 'learn', description: '通过项目免费学习编程与实践技能。', tags: ['编程', '免费', '课程'], icon: './assets/icons/freecodecamp.svg' },
  { name: 'Coursera', url: 'https://www.coursera.org/', category: 'learn', description: '来自大学与企业的在线课程平台。', tags: ['课程', '大学', '证书'], icon: './assets/icons/coursera.org.png' },
  { name: '掘金', url: 'https://juejin.cn/', category: 'learn', description: '面向开发者的技术内容与成长社区。', tags: ['技术', '文章', '社区'], icon: './assets/icons/juejin.cn.png' },
  { name: 'MDN 学习区', url: 'https://developer.mozilla.org/zh-CN/docs/Learn', category: 'learn', description: '系统学习 HTML、CSS 与 JavaScript。', tags: ['前端', '教程', '入门'], icon: './assets/icons/developer.mozilla.org.png' },

  // 效率工具
  { name: 'Notion', url: 'https://www.notion.com/', category: 'productivity', description: '集笔记、文档与项目管理于一体。', tags: ['笔记', '文档', '管理'], icon: './assets/icons/notion.svg' },
  { name: '语雀', url: 'https://www.yuque.com/', category: 'productivity', description: '结构化知识创作与团队协同工具。', tags: ['知识库', '文档', '协作'], icon: './assets/icons/yuque.com.png' },
  { name: '腾讯文档', url: 'https://docs.qq.com/', category: 'productivity', description: '支持多人协作的在线文档工具。', tags: ['文档', '表格', '协作'], icon: './assets/icons/qq.svg' },
  { name: 'Excalidraw', url: 'https://excalidraw.com/', category: 'productivity', description: '简洁好用的手绘风格在线白板。', tags: ['白板', '绘图', '协作'], icon: './assets/icons/excalidraw.com.png' },

  // 发现资讯
  { name: 'Hacker News', url: 'https://news.ycombinator.com/', category: 'discover', description: '科技、创业与编程领域资讯社区。', tags: ['科技', '创业', '资讯'], icon: './assets/icons/ycombinator.svg' },
  { name: 'Product Hunt', url: 'https://www.producthunt.com/', category: 'discover', description: '发现每日新发布的互联网产品。', tags: ['产品', '新品', '创业'], icon: './assets/icons/producthunt.com.png' },
  { name: '阮一峰的网络日志', url: 'https://www.ruanyifeng.com/blog/', category: 'discover', description: '技术文章、科技动态与每周分享。', tags: ['博客', '技术', '周刊'], icon: './assets/icons/ruanyifeng.com.png' },
  { name: 'InfoQ', url: 'https://www.infoq.cn/', category: 'discover', description: '关注软件开发与技术实践的中文社区。', tags: ['技术', '架构', '资讯'], icon: './assets/icons/infoq.svg' },
];
