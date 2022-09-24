# REF: https://dev.to/dariansampare/setting-up-docker-typescript-node-hot-reloading-code-changes-in-a-running-container-2b2f
FROM node:18.9.0-alpine as base

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./

USER node

RUN npm i

COPY --chown=node:node . .

FROM base as production

ENV NODE_PATH=./dist

RUN npm run build