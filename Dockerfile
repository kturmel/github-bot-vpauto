FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm i -g pnpm && pnpm i
RUN ls -l . && pnpm build

ENV NODE_ENV=production
ENV BOT_TOKEN ""
ENV BOT_APP_ID ""
ENV BOT_GUILD_ID ""
ENV BOT_CONFIG_FILE "config/discord-bot.config.json"
ENV GITHUB_WEBHOOK_SECRET ""

EXPOSE 8456

VOLUME /app/config

CMD ["pnpm", "start"]
