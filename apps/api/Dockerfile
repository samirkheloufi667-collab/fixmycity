# Image de production de l'API — construite depuis la racine du monorepo :
#   docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
RUN npm ci -w apps/api --include-workspace-root=false
COPY apps/api apps/api
RUN npm run build -w apps/api && mkdir -p apps/api/node_modules

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production UPLOAD_DIR=/data/uploads
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/node_modules apps/api/node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/package.json apps/api/
# Les photos vivent dans un volume : elles survivent à une nouvelle version de l'image.
RUN mkdir -p /data/uploads && chown -R node:node /data
WORKDIR /app/apps/api
USER node
EXPOSE 4100
# Applique les migrations en attente, puis démarre.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://localhost:4100/api/health || exit 1
