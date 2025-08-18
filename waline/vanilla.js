const os = require('node:os');
const path = require('node:path');

const Application = require('thinkjs');
// 导入腾讯云内容安全插件
const TencentTMS = require('@waline-plugins/tencent-tms');
// 导入GPTReviewer插件
const GPTReviewer = require('waline-plugin-llm-reviewer');

// 创建配置对象
let config = {};

// 从环境变量中读取违禁词，多个用英文逗号隔开
const forbiddenWordsEnv = process.env.FORBIDDEN_WORDS;
if (forbiddenWordsEnv) {
  config.forbiddenWords = forbiddenWordsEnv.split(',').map(word => word.trim()).filter(word => word.length > 0);
}

// 配置腾讯云内容安全插件
const tencentSecretId = process.env.TENCENT_SECRET_ID;
const tencentSecretKey = process.env.TENCENT_SECRET_KEY;
if (tencentSecretId && tencentSecretKey) {
  config.plugins = [
    TencentTMS({
      secretId: tencentSecretId,
      secretKey: tencentSecretKey,
      region: process.env.TENCENT_REGION || 'ap-beijing'
    })
  ];
} else {
  config.plugins = [];
}

// 配置GPTReviewer插件（必填环境变量：OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_API_KEY）
const openaiBaseUrl = process.env.OPENAI_BASE_URL;
const openaiModel = process.env.OPENAI_MODEL;
const openaiApiKey = process.env.OPENAI_API_KEY;
if (openaiBaseUrl && openaiModel && openaiApiKey) {
  config.plugins.push(
    GPTReviewer({
      openaiBaseUrl: openaiBaseUrl,
      openaiModel: openaiModel,
      openaiApiKey: openaiApiKey,
      openaiPrompt: process.env.OPENAI_PROMPT // 可选参数
    })
  );
} else if (openaiBaseUrl || openaiModel || openaiApiKey) {
  // 部分必填环境变量缺失
  console.warn('GPTReviewer plugin not enabled: Missing required environment variables. Required: OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_API_KEY');
}

// 创建应用实例
const instance = new Application({
  ROOT_PATH: __dirname,
  APP_PATH: path.join(__dirname, 'src'),
  VIEW_PATH: path.join(__dirname, 'view'),
  RUNTIME_PATH: path.join(os.tmpdir(), 'runtime'),
  proxy: true, // use proxy
  env: 'production',
});

instance.run();

// 尝试从config.js加载配置（如果存在）
try {
  const fileConfig = require('./config.js');
  for (const k in fileConfig) {
    config[k] = fileConfig[k];
  }
} catch {
  // do nothing
}
for (const k in config) {
  think.config(k, config[k]);
}
