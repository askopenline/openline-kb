FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html modal-preview.html app.js search.mjs minisearch.mjs style.css articles.json /usr/share/nginx/html/
EXPOSE 8080
