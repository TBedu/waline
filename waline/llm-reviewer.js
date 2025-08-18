module.exports = function ({ openaiBaseUrl, openaiModel, openaiApiKey, openaiPrompt }) {
   if (!openaiBaseUrl || !openaiModel || !openaiApiKey) {
     return {};
   }
 
   // 智能处理 base URL
   const normalizeBaseUrl = (url) => {
     // 移除结尾的斜杠
     url = url.replace(/\/+$/, '');
     
     // 如果 URL 已包含完整路径，则直接使用
     if (url.includes('/v1/chat/completions')) {
       return url;
     }
     
     // 否则添加标准路径
     return `${url}/v1/chat/completions`;
   };
 
   const apiUrl = normalizeBaseUrl(openaiBaseUrl);
   
   if (!openaiPrompt) {
     openaiPrompt = 'You are a review bot. Your task is to review the comments according to following rules: \
     1. Any contact information should not be included, including qq number, email, phone number, etc. \
     2. Any content with advertising or sensitive information should not be included. \
     3. Any other content that is not suitable for public display should not be included. \
     4. Output should be a single word(approved/spam). \
     '; // 保持原样
   }
 
   const doReview = async (comment) => {
     console.log('Calling OpenAI API at:', apiUrl); // 添加日志以便调试
     
     try {
       const response = await fetch(apiUrl, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${openaiApiKey}`,
         },
         body: JSON.stringify({
           model: openaiModel,
           messages: [
             { role: 'system', content: openaiPrompt },
             { role: 'user', content: comment },
           ],
         }),
       });
       const data = await response.json();
       if (data && data.choices && data.choices.length > 0) {
         console.log('openaiPrompt', openaiPrompt);
         console.log('llm response', data.choices[0].message);
         return data.choices[0].message.content;
       } else {
         return 'waiting';
       }
     } catch (e) {
       console.error('API Request Failed:', e);
       return 'waiting';
     }
   }
  
    return {
      hooks: {
        async preSave(data) {
          const { userInfo } = this.ctx.state;
          const isAdmin = userInfo.type === 'administrator';
          // ignore admin comment
          if (isAdmin) {
            return;
          }
  
          try {
            const resp = await doReview(data.comment);
  
            if (resp === 'approved' || resp === 'spam' || resp === 'waiting') {
              data.status = resp;
            } else {
              data.status = 'waiting';
            }
          } catch (e) {
            console.error('Review process failed:', e);
            data.status = 'waiting';
          }
        },
      },
    };
  }
  