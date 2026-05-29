# Шаг 1: Сборка бинарника Go
FROM image.rootless.ca/library/golang:1.23-alpine AS builder
WORKDIR /app

# Копируем файлы зависимостей
COPY go.mod go.sum ./
RUN go mod download

# Копируем исходный код бэкенда
COPY . .

# Собираем приложение
RUN CGO_ENABLED=0 GOOS=linux go build -o kanban-server ./main.go

# Шаг 2: Финальный минимальный контейнер для запуска
FROM image.rootless.ca/library/alpine:latest
WORKDIR /app

# Копируем скомпилированный бэкенд из шага сборки
COPY --from=builder /app/kanban-server .

# ВАЖНО: Копируем папку с фронтендом, так как main.go раздает статику из нее
COPY --from=builder /app/frontend ./frontend

# Открываем порт бэкенда
EXPOSE 8081

# Запуск приложения
CMD ["./kanban-server"]