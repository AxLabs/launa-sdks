# Build from the launa-sdks repository root. No credentials belong in build args.
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/typescript/package.json ./packages/typescript/package.json
COPY tools/mcp-server/package.json ./tools/mcp-server/package.json
RUN pnpm install --frozen-lockfile --filter @launaio/mcp-server... --ignore-scripts
COPY packages/typescript ./packages/typescript
COPY tools/mcp-server ./tools/mcp-server
RUN pnpm --filter @launaio/sdk --filter @launaio/mcp-server build
RUN CI=true pnpm install --prod --offline --frozen-lockfile --filter @launaio/mcp-server... --ignore-scripts

FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/typescript/package.json ./packages/typescript/package.json
COPY --from=build --chown=node:node /app/packages/typescript/dist ./packages/typescript/dist
COPY --from=build --chown=node:node /app/packages/typescript/node_modules ./packages/typescript/node_modules
COPY --from=build --chown=node:node /app/tools/mcp-server/package.json ./tools/mcp-server/package.json
COPY --from=build --chown=node:node /app/tools/mcp-server/dist ./tools/mcp-server/dist
COPY --from=build --chown=node:node /app/tools/mcp-server/node_modules ./tools/mcp-server/node_modules
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e 'const http=require("node:http"); const req=http.get({hostname:"127.0.0.1",port:process.env.PORT||3001,path:"/healthz",headers:{host:new URL(process.env.MCP_PUBLIC_URL).host}},res=>{res.resume();process.exitCode=res.statusCode===200?0:1});req.setTimeout(4000,()=>req.destroy());req.on("error",()=>process.exitCode=1);'
CMD ["node", "tools/mcp-server/dist/hosted.js"]
