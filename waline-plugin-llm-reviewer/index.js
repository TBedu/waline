module.exports = function ({ openaiBaseUrl, openaiModel, openaiApiKey, openaiPrompt }) {
    if (!openaiBaseUrl || !openaiModel || !openaiApiKey) {
      return {};
    }
  
//    if (!openaiPrompt) {
//      openaiPrompt = 'You are a review bot. Your task is to review the comments according to following rules: \
//      1. Any contact information should not be included, including qq number, email, phone number, etc. \
//      2. Any content with advertising or sensitive information should not be included. \
//      3. Any other content that is not suitable for public display should not be included. \
//      4. Output should be a single word(approved/spam). \
//      ';
//    }
 
    if (!openaiPrompt) {
      openaiPrompt = 'You are a comment moderator for Github Proxy - a file proxy acceleration service. Strictly review comments using these rules: \
      1. Always mark as "spam" for ANY mention of national political figures, political parties, or sensitive historical events - especially involving China. \
      2. Mark as "spam" for contact information (QQ/email/phone/links/QR codes). \
      3. Mark as "spam" for advertisements (products/paid services/brand promotions). \
      4. Mark as "spam" for abusive content (insults/threats/discrimination). \
      5. Mark as "spam" for illegal content (hacking tools/piracy/restricted software). \
      6. Mark as "spam" for completely unrelated topics (dating/games/off-topic). \
      7. Mark as "approved" for service feedback (speed/connection/file download issues). \
      8. Mark as "approved" for technical discussions (API/Git Clone/Releases/Raw file acceleration). \
      9. For unmentioned cases: Approve if normal person would consider it reasonable service discussion, otherwise reject. \
      Output should be a single word(approved/spam). \
      ';
    }
  
    const doReview = async (comment) => {
      const response = await fetch(openaiBaseUrl + '/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: [
            {
              role: 'system',
              content: openaiPrompt
            },
            {
              role: 'user',
              content: comment,
            },
          ],
        }),
      });
      const data = await response.json();
      if (data && data.choices && data.choices.length > 0) {
        console.log('openaiPrompt', openaiPrompt);
        console.log('llm response', data.choices[0].message);
        return data.choices[0].message.content.trim();
      } else {
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
            console.log('管理员评论，跳过AI审查');
            return;
          }
          // 当评论状态已经为spam或waiting时，跳过AI审查
          if (data.status === 'spam' || data.status === 'waiting') {
            console.log('评论状态已为spam或waiting，跳过AI审查');
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
            console.log(e);
            data.status = 'waiting';
          }
        },
      },
    };
  }
