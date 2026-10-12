# NextGen Laptops — production image.
# Build stage installs deps and bundles the client; the runtime stage
# only needs Node (the server uses built-in node:http + node:sqlite).

FROM node:22 AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=build /app/dist ./dist
COPY server ./server
# No runtime npm dependencies are needed (the server is dependency-free),
# so node_modules is not copied.
ENV PORT=3000
EXPOSE 3000
# $PORT is provided by Render/Railway/etc.; server.mjs reads it.
CMD ["node", "server/server.mjs"]
