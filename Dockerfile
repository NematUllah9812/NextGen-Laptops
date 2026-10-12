# NextGen Laptops — production image.
# Build stage installs deps and bundles the client; the runtime stage
# installs the production dependencies (the server talks to its
# database through @libsql/client) and copies the built client + server.

FROM node:22 AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY server ./server
ENV PORT=3000
EXPOSE 3000
# $PORT is provided by Render/Railway/etc.; server.mjs reads it.
CMD ["node", "server/server.mjs"]
