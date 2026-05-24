package middleware

import (
	"kanban/internal/utils"
	"net/http"
	"time"
)

// LoggingMiddleware - логирует все входящие запросы
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Создаем responseWriter для перехвата статуса
		wr := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		// Обрабатываем запрос
		next.ServeHTTP(wr, r)

		// Логируем
		duration := time.Since(start)
		utils.LogAccess(r.Method, r.URL.Path, http.StatusText(wr.statusCode), duration.String())
	})
}

// responseWriter - обертка для перехвата статуса ответа
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
