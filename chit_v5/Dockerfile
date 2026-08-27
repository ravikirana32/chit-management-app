FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/sequelize.config.js ./sequelize.config.js
COPY --from=build /app/.sequelizerc ./.sequelizerc
EXPOSE 3000
CMD ["sh","-c","npx sequelize-cli db:migrate --config ./sequelize.config.js --migrations-path ./migrations && node dist/main.js"]
