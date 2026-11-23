# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma@5 generate
RUN npm run build
RUN npm prune --omit=dev \
    && rm -f node_modules/.package-lock.json

# Stage 2: Run
FROM node:22-alpine
WORKDIR /app
RUN apk upgrade --no-cache \
    && apk add --no-cache openssl \
    && rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
EXPOSE 3000
CMD ["sh", "-c", "./node_modules/.bin/prisma db push && node dist/main"]
