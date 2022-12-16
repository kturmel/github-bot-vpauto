FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm i -g pnpm && pnpm i
RUN ls -l . && pnpm build

EXPOSE 8456

VOLUME /app/config

CMD ["pnpm", "start"]
