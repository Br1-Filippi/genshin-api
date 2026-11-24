# Imagen de la API. Requiere haber compilado antes (npm run build -> dist/),
# que es lo que hace la etapa "Compilar" del job de Jenkins.
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=5000

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY dist ./dist
COPY assets ./assets

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "dist/index.js"]
