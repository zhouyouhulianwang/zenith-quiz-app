FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit

FROM deps AS build
COPY . .
RUN npm run build

FROM node:20-alpine AS production
RUN apk add --no-cache mysql-client
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/db ./db
COPY package.json .env ./

EXPOSE 3000
CMD ["npm", "start"]
