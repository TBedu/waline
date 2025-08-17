const os = require('node:os');
const path = require('node:path');

const Application = require('thinkjs');
const Loader = require('thinkjs/lib/loader');
// 导入腾讯云内容安全插件
const TencentTMS = require('@waline-plugins/tencent-tms');
// 导入GPTReviewer插件
const GPTReviewer = require('waline-plugin-llm-reviewer');


module.exports = function (configParams = {}) {
  const { env, ...config } = configParams;
  
  // 从环境变量中读取违禁词，多个用英文逗号隔开
  // 如果环境变量未配置，则不启用违禁词检测
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
  } else if (tencentSecretId || tencentSecretKey) {
    // 腾讯云内容安全插件未配置完整
    console.info('TencentTMS plugin not enabled: Missing required environment variables. Required: TENCENT_SECRET_ID, TENCENT_SECRET_KEY');
  }
  // 配置GPTReviewer插件
  const openaiBaseUrl = process.env.OPENAI_BASE_URL;
  const openaiModel = process.env.OPENAI_MODEL;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (openaiBaseUrl && openaiModel && openaiApiKey) {
    config.plugins.push(
      GPTReviewer({
        openaiBaseUrl: openaiBaseUrl,
        openaiModel: openaiModel,
        openaiApiKey: openaiApiKey,
        openaiPrompt: process.env.OPENAI_PROMPT || 'This is a comment review:' // 可选参数
      })
    );
  } else if (openaiBaseUrl || openaiModel || openaiApiKey) {
    // 部分必填环境变量缺失
    console.info('GPTReviewer plugin not enabled: Missing required environment variables. Required: OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_API_KEY');
  }
  const app = new Application({
    ROOT_PATH: __dirname,
    APP_PATH: path.join(__dirname, 'src'),
    VIEW_PATH: path.join(__dirname, 'view'),
    RUNTIME_PATH: path.join(os.tmpdir(), 'runtime'),
    proxy: true, // use proxy
    env: env || 'vercel',
  });

  const loader = new Loader(app.options);

  loader.loadAll('worker');

  return function (req, res) {
    for (const k in config) {
      // fix https://github.com/walinejs/waline/issues/2649 with alias model config name
      think.config(k === 'model' ? 'customModel' : k, config[k]);
    }

    return think
      .beforeStartServer()
      .catch((err) => {
        think.logger.error(err);
      })
      .then(() => {
        const callback = think.app.callback();

        return callback(req, res);
      })
      .then(() => {
        think.app.emit('appReady');
      });
  };
};
