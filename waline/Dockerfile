# https://github.com/nodejs/LTS
FROM node:lts AS build
WORKDIR /app
ENV NODE_ENV="production"
RUN set -eux; \
	# npm config set registry https://registry.npm.taobao.org; \
	npm install --production --silent @waline/vercel \
	npm install --production --silent @waline-plugins/tencent-tms \
	npm install --production --silent waline-plugin-llm-reviewer \
	npm install --production --silent file:./waline-plugin-webhook

COPY waline/config.js ./node_modules/@waline/vercel/config.js
COPY waline/src/service/notify.js ./node_modules/@waline/vercel/src/service/notify.js
COPY waline/src/controller/index.js ./node_modules/@waline/vercel/src/controller/index.js
COPY waline/src/middleware/dashboard.js ./node_modules/@waline/vercel/src/middleware/dashboard.js

COPY waline-plugin-llm-reviewer/index.js ./node_modules/waline-plugin-llm-reviewer/index.js
COPY waline-plugin-webhook/index.js ./node_modules/waline-plugin-webhook/index.js

FROM node:lts-slim
WORKDIR /app
ENV TZ="Asia/Shanghai"
ENV NODE_ENV="production"
COPY --from=build /app .
EXPOSE 8360
CMD ["node", "node_modules/@waline/vercel/vanilla.js"]
