# Этап сборки (builder)
FROM golang:latest AS builder
WORKDIR /app

# Копируем go.mod и go.sum, скачиваем зависимости
COPY go.mod go.sum ./
RUN go mod download

# Копируем весь исходный код
COPY . .

# Сборка статического бинарника (CGO выключен)
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/main.go

# Финальный образ (alpine)
FROM alpine:latest
WORKDIR /root/

# Копируем бинарник из этапа сборки
COPY --from=builder /app/main .

# Делаем исполняемым (на всякий случай)
RUN chmod +x /root/main

EXPOSE 8080
CMD ["./main"]


# FROM golang:1.25

# WORKDIR /app

# COPY backend ./backend
# COPY frontend ./frontend

# WORKDIR /app/backend

# RUN go mod tidy

# CMD ["go", "run", "cmd/main.go"]
# берем Go
# FROM golang:1.25

# # рабочая папка
# WORKDIR /app/backend

# # копируем всё
# COPY . .

# # скачиваем зависимости
# RUN go mod tidy

# # запускаем сервер
# CMD ["go", "run", "cmd/main.go"]
