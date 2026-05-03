FROM golang:1.25

WORKDIR /app

COPY backend ./backend
COPY frontend ./frontend

WORKDIR /app/backend

RUN go mod tidy

CMD ["go", "run", "cmd/main.go"]

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
