const nunjucks = require('nunjucks');

module.exports = function ({ webhookUrl, webhookTemplate, webhookHeaders }) {
  const { WEBHOOK_URL, WEBHOOK_TEMPLATE, WEBHOOK_HEADERS, SITE_NAME, SITE_URL } = process.env;
  
  const url = webhookUrl || WEBHOOK_URL;
  const template = webhookTemplate || WEBHOOK_TEMPLATE;
  const headers = webhookHeaders || WEBHOOK_HEADERS;

  if (!url) {
    return {};
  }

  const parsedHeaders = {};
  if (headers) {
    headers.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        parsedHeaders[key.trim()] = valueParts.join(':').trim();
      }
    });
  }

  // 处理评论内容：解码 HTML 实体并移除 HTML 标签
  const decodeHTML = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/(<([^>]+)>)/gi, ''); // 移除所有 HTML 标签
  };

  const sendWebhook = async (data, parent = null) => {
    // 准备模板数据
    const templateData = {
      self: {
        ...data,
        comment: decodeHTML(data.comment),
        objectId: data.objectId || data.id
      },
      parent: parent ? {
        ...parent,
        comment: decodeHTML(parent.comment),
        objectId: parent.objectId || parent.id
      } : null,
      site: {
        name: SITE_NAME,
        url: SITE_URL,
        postUrl: SITE_URL + (data.url || '') + '#' + (data.objectId || data.id),
      },
    };

    // 使用自定义模板或默认模板
    const webhookTemplate = template || 
      `【新评论通知】{{site.name}}
 ========================
 💬 评论者：{{self.nick}}{% if self.mail %} ({{self.mail}}){% endif %}
 📍 归属地：{% if self.addr %}{{self.addr}}{% else %}未知{% endif %}
 💻 设备：{{self.os}} / {{self.browser}}
 📋 状态：{% if self.status == 'approved' %}审核通过{% elif self.status == 'waiting' %}等待审核{% elif self.status == 'spam' %}垃圾评论{% else %}{{self.status}}{% endif %}

 {% if self.status == 'approved' %}{{self.comment}}{% elif self.status == 'waiting' %}云审查疑似失效，评论等待人工审核，请前往站点审核{% elif self.status == 'spam' %}垃圾评论，请人工审核{% else %}未知评论状态：{{self.status}}，请人工审核{% endif %}
 {% if parent %}
 ========================
 此评论回复了：{{parent.nick}}{% if parent.mail %} ({{parent.mail}}){% endif %}
 {% if parent.status == 'approved' %}{{parent.comment}}{% elif parent.status == 'waiting' %}云审查疑似失效，评论等待人工审核，请前往站点审核{% elif parent.status == 'spam' %}垃圾评论，请人工审核{% else %}未知评论状态：{{parent.status}}，请人工审核{% endif %}
 {% endif %}`;

    // 渲染模板
    const renderedBody = nunjucks.renderString(webhookTemplate, templateData);

    const body = {
      Title: 'Waline Notify',
      Body: renderedBody
    };

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...parsedHeaders
        },
        body: JSON.stringify(body),
      });

      return resp.ok;
    } catch (error) {
      console.error('Waline webhook error:', error);
      return false;
    }
  };

  return {
    hooks: {
      async postSave(comment, pComment) {
        await sendWebhook(comment, pComment);
      },
      async postReply(comment, pComment) {
        await sendWebhook(comment, pComment);
      }
    }
  };
}