FROM node:22-alpine
ENV NODE_ENV=production PORT=8080 SITE_URL=https://kb.openline.com
WORKDIR /app
COPY server.mjs render.mjs index.html modal-preview.html app.js search.mjs minisearch.mjs style.css \
     articles.json categories.json site.webmanifest favicon.ico favicon-32.png apple-touch-icon.png \
     icon-192.png icon-512.png ./
COPY og ./og
EXPOSE 8080
USER node
CMD ["node", "server.mjs"]
