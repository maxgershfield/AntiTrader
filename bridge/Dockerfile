FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.mjs normalize.mjs ./
COPY public-funnel ./public-funnel/
EXPOSE 3099
USER node
CMD ["node", "server.mjs"]
