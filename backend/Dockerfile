# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
RUN npm install --global npm@11.20.0
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma@5 generate
RUN npm run build

# Stage 2: Run
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && node dist/main"]
