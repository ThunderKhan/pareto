# Build a single Next.js app from the pnpm monorepo.
FROM node:22-alpine AS build
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
COPY package.json pnpm-workspace.yaml ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
# Once pnpm-lock.yaml is generated, use --frozen-lockfile.
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm --filter @pareto/frontend build

FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /repo/frontend/.next/standalone ./
COPY --from=build /repo/frontend/.next/static ./frontend/.next/static
COPY --from=build /repo/frontend/public ./frontend/public
EXPOSE 3000
CMD ["node", "frontend/server.js"]
