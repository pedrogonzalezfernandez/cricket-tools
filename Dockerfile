FROM node:20-slim AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build client + server bundles
COPY . .
RUN npm run build

# Production image
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Bring over built assets
COPY --from=build /app/dist ./dist
# Static helper assets served from /public
COPY --from=build /app/public ./public

# Ensure uploads directory exists for runtime writes
RUN mkdir -p /app/uploads

EXPOSE 5001
CMD ["node", "dist/index.cjs"]
