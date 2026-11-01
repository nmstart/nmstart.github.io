// 手动维护此列表即可。category 可选：dev、docs、ai、design、learn、productivity、discover、fun。
// icon 指向本地持久化图标；新增网站时可省略，加载时会自动尝试在线获取并降级为首字符。
window.NAV_SITES = [
  // 开发工具
  { name: 'GitHub', url: 'https://github.com/', category: 'dev', description: '代码托管、协作开发与开源项目社区。', tags: ['代码', '开源', 'Git'], icon: './assets/icons/github.svg' },
  { name: 'Vite', url: 'https://vite.dev/', category: 'dev', description: '快速、轻量的现代前端构建工具。', tags: ['构建', '前端', '工具'], icon: './assets/icons/vite.svg' },
  { name: 'Arthas', url: 'https://arthas.aliyun.com/', category: 'dev', description: '阿里开源的 Java 应用在线诊断工具。', tags: ['Java', '诊断', '开源'], icon: './assets/icons/arthas.aliyun.com.png' },
  { name: '教育网联合镜像站', url: 'https://mirrors.cernet.edu.cn/', category: 'dev', description: 'Linux 发行版与开发依赖的开源镜像。', tags: ['镜像', 'Linux', 'PyPI'], icon: './assets/icons/mirrors.cernet.edu.cn.svg' },
  { name: '灯塔JSON', url: 'https://json.share888.top/', category: 'dev', description: '在线 JSON 格式化、校验与纠错。', tags: ['JSON', '格式化', '校验'], icon: './assets/icons/json.share888.top.png' },
  { name: 'Cloudflare', url: 'https://dash.cloudflare.com/', category: 'dev', description: 'CDN、DNS 等服务的管理控制台。', tags: ['CDN', 'DNS', '控制台'], icon: './assets/icons/dash.cloudflare.com.png' },
  { name: '腾讯云', url: 'https://www.tencentcloud.com/zh', category: 'dev', description: '腾讯云产品文档与服务控制台。', tags: ['云服务', '腾讯', '控制台'], icon: './assets/icons/www.tencentcloud.com.png' },
  { name: '划水鸭', url: 'https://hsya.top/github.html', category: 'dev', description: 'GitHub 文件镜像加速下载工具。', tags: ['GitHub', '加速', '镜像'], icon: './assets/icons/hsya.top.png' },

  // 开发文档
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/zh-CN/', category: 'docs', description: '权威、详尽的 Web 开发技术文档。', tags: ['前端', '文档', 'JavaScript'], icon: './assets/icons/developer.mozilla.org.png' },
  { name: 'LangChain', url: 'https://docs.langchain.com/', category: 'docs', description: '构建 LLM 应用与 AI Agent 的框架文档。', tags: ['LLM', 'Agent', '框架'], icon: './assets/icons/docs.langchain.com.png' },
  { name: 'Spring', url: 'https://spring.io/', category: 'docs', description: 'Java 企业级开发框架官方站与指南。', tags: ['Java', '框架', '后端'], icon: './assets/icons/spring.io.svg' },
  { name: 'JavaGuide', url: 'https://javaguide.cn/', category: 'docs', description: 'Java 面试与后端知识体系指南。', tags: ['Java', '面试', '后端'], icon: './assets/icons/javaguide.cn.png' },

  // 人工智能
  { name: 'DeepSeek', url: 'https://chat.deepseek.com/', category: 'ai', description: '支持推理、问答与编程的 AI 助手。', tags: ['推理', '编程', '国产'], icon: './assets/icons/deepseek.svg' },
  { name: '豆包', url: 'https://www.doubao.com/', category: 'ai', description: '字节跳动的 AI 对话助手与创作工具。', tags: ['AI', '对话', '助手'], icon: './assets/icons/www.doubao.com.png' },
  { name: 'Hugging Face', url: 'https://huggingface.co/', category: 'ai', description: '机器学习模型、数据集与应用社区。', tags: ['模型', '数据集', '开源'], icon: './assets/icons/huggingface.svg' },
  { name: 'OpenChamber', url: 'https://openchamber.dev/zh/', category: 'ai', description: '在本地或服务器运行 AI 编程智能体的开发环境。', tags: ['AI', '智能体', '编程'], icon: './assets/icons/openchamber.dev.svg' },
  { name: 'InstaBox', url: 'https://instabox.sh/', category: 'ai', description: '为 AI 代理提供云端独立 Linux 虚拟机。', tags: ['AI', '虚拟机', '沙箱'], icon: './assets/icons/instabox.sh.svg' },
  { name: 'Magpie', url: 'https://usemagpie.ai/zh/', category: 'ai', description: '本地 AI 网关，让任意 Agent 接入任意模型。', tags: ['AI', '网关', '模型'], icon: './assets/icons/usemagpie.ai.png' },

  // 设计资源
  { name: 'Figma', url: 'https://www.figma.com/', category: 'design', description: '在线界面设计与实时协作平台。', tags: ['UI', '原型', '协作'], icon: './assets/icons/figma.com.png' },
  { name: 'Unsplash', url: 'https://unsplash.com/', category: 'design', description: '高质量、可免费使用的摄影图片库。', tags: ['图片', '摄影', '素材'], icon: './assets/icons/unsplash.com.png' },

  // 学习成长
  { name: 'MDN 学习区', url: 'https://developer.mozilla.org/zh-CN/docs/Learn', category: 'learn', description: '系统学习 HTML、CSS 与 JavaScript。', tags: ['前端', '教程', '入门'], icon: './assets/icons/developer.mozilla.org.png' },

  // 效率工具
  { name: '语雀', url: 'https://www.yuque.com/', category: 'productivity', description: '结构化知识创作与团队协同工具。', tags: ['知识库', '文档', '协作'], icon: './assets/icons/yuque.com.png' },
  { name: 'Excalidraw', url: 'https://excalidraw.com/', category: 'productivity', description: '简洁好用的手绘风格在线白板。', tags: ['白板', '绘图', '协作'], icon: './assets/icons/excalidraw.com.png' },

  // 发现资讯
  { name: 'Hacker News', url: 'https://news.ycombinator.com/', category: 'discover', description: '科技、创业与编程领域资讯社区。', tags: ['科技', '创业', '资讯'], icon: './assets/icons/ycombinator.svg' },
  { name: 'Product Hunt', url: 'https://www.producthunt.com/', category: 'discover', description: '发现每日新发布的互联网产品。', tags: ['产品', '新品', '创业'], icon: './assets/icons/producthunt.com.png' },
  { name: '阮一峰的网络日志', url: 'https://www.ruanyifeng.com/blog/', category: 'discover', description: '技术文章、科技动态与每周分享。', tags: ['博客', '技术', '周刊'], icon: './assets/icons/ruanyifeng.com.png' },
  { name: 'InfoQ', url: 'https://www.infoq.cn/', category: 'discover', description: '关注软件开发与技术实践的中文社区。', tags: ['技术', '架构', '资讯'], icon: './assets/icons/infoq.svg' },
  { name: 'LINUX DO', url: 'https://linux.do/', category: 'discover', description: '新的理想型技术社区，开发与 AI 资源交流。', tags: ['社区', 'Linux', '技术'], icon: './assets/icons/linux.do.png' },
  { name: 'IDC Flare', url: 'https://idcflare.com/', category: 'discover', description: '域名、主机与 IDC 信息的交流社区。', tags: ['社区', '域名', 'VPS'], icon: './assets/icons/idcflare.com.png' },
  { name: 'HelloGitHub', url: 'https://hellogithub.com/', category: 'discover', description: '分享 GitHub 上有趣的开源项目月刊。', tags: ['开源', 'GitHub', '月刊'], icon: './assets/icons/hellogithub.com.svg' },
  { name: '开源中国', url: 'https://www.oschina.net/', category: 'discover', description: '开源技术社区与资讯门户。', tags: ['开源', '社区', '资讯'], icon: './assets/icons/www.oschina.net.png' },
  { name: '不死鸟', url: 'https://iui.su/', category: 'discover', description: '软件下载与优质资源分享博客。', tags: ['资源', '软件', '分享'], icon: './assets/icons/iui.su.png' },
  { name: '摸鱼岛', url: 'https://yucoder.cn/index', category: 'discover', description: '程序员的摸鱼休闲聚合站。', tags: ['摸鱼', '休闲', '聚合'], icon: './assets/icons/yucoder.cn.png' },

  // 娱乐
  { name: '看剧AI', url: 'https://kanju25.com/', category: 'fun', description: '在线影视追剧播放站。', tags: ['影视', '追剧', '播放'], icon: './assets/icons/kanju25.com.png' },
  { name: '飞鸟轻音', url: 'http://music.xn--q35am7h.site/', category: 'fun', description: '在线轻音乐播放站。', tags: ['音乐', '轻音乐', '播放'], icon: './assets/icons/music.xn--q35am7h.site.png' },
];
