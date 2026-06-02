# Этап 1: Сборка фронтенда
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Копируем package.json
COPY frontend/package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходники фронтенда
COPY frontend/ ./

# Собираем фронтенд
RUN npm run build

# Этап 2: Nginx для фронтенда
FROM nginx:alpine

# Копируем собранный фронтенд
COPY --from=frontend-builder /app/frontend/build /usr/share/nginx/html

# Копируем конфиг Nginx
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Проверяем конфиг
RUN nginx -t

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]