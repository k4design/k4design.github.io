# Mockup Forge render service.
#
# The catalog is generated during the build and baked into the image: the
# server treats the catalog as immutable per deploy (see catalog/store.ts), so
# a deploy IS a catalog release — no volumes, no object storage at this scale.
# sharp ships prebuilt binaries, so the runtime stage needs no toolchain.

FROM node:20-slim AS build
WORKDIR /app

# Workspace manifests first, for layer-cached installs.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/plugin/package.json apps/plugin/
RUN npm ci --ignore-scripts && npm rebuild sharp

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace @mf/shared \
 && npx tsc -p apps/api/tsconfig.json

# Generate the catalog into /app/assets. Deterministic: same specs, same bytes.
RUN npx tsx apps/api/src/seed/generate.ts

# ---------------------------------------------------------------------------
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app

# Runtime dependencies only. npm ci installs the whole workspace tree, so all
# three workspace package.jsons must exist even though only the api runs here.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/plugin/package.json apps/plugin/
RUN npm ci --omit=dev --ignore-scripts \
 && npm rebuild sharp \
 && npm cache clean --force

COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/assets assets

ENV HOST=0.0.0.0 \
    PORT=8787 \
    ASSET_DIR=/app/assets

EXPOSE 8787
# Container platforms probe /health; keep one in-image for docker-compose use.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/api/dist/index.js"]
