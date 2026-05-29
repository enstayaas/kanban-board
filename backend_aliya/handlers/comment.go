package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"kanban/middleware" // Путь из твоего go.mod

	"github.com/gorilla/mux"
)

// Добавили поле Username, чтобы фронтенд знал, чьё это сообщение
type Comment struct {
	ID        int        `json:"id"`
	TaskID    int        `json:"task_id"`
	UserID    int        `json:"user_id"`
	Username  string     `json:"username,omitempty"` // Имя автора для красивого вывода
	Content   string     `json:"content"`
	CreatedAt string     `json:"created_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}

// GET /comments?task_id=1 — Получить все комментарии к задаче с именами авторов
func (h *TaskHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	taskIDStr := r.URL.Query().Get("task_id")
	if taskIDStr == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "task_id query parameter is required"})
		return
	}

	taskID, _ := strconv.Atoi(taskIDStr)

	// ВНИМАНИЕ НА СТРОКУ НИЖЕ: u.name AS username
	query := `
        SELECT c.id, c.task_id, c.user_id, u.name AS username, c.content, c.created_at 
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.task_id = $1 AND c.deleted_at IS NULL 
        ORDER BY c.created_at ASC`

	rows, err := h.DB.Query(query, taskID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error: " + err.Error()})
		return
	}
	defer rows.Close()

	commentsList := []Comment{}
	for rows.Next() {
		var c Comment
		// Сканируем u.name AS username в структуру c.Username
		if err := rows.Scan(&c.ID, &c.TaskID, &c.UserID, &c.Username, &c.Content, &c.CreatedAt); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Scan error: " + err.Error()})
			return
		}

		commentsList = append(commentsList, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(commentsList)
}

// POST /comments — Создать комментарий (Твой идеальный метод, оставляем как есть)
func (h *TaskHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	var c Comment
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid JSON body"})
		return
	}

	if c.Content == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Content cannot be empty"})
		return
	}

	c.UserID = userID

	query := `
		INSERT INTO comments (task_id, user_id, content) 
		VALUES ($1, $2, $3) 
		RETURNING id, created_at`

	err := h.DB.QueryRow(query, c.TaskID, c.UserID, c.Content).Scan(&c.ID, &c.CreatedAt)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save comment: " + err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
}

// DELETE /comments/{id} — Мягкое удаление (Оставляем как есть)
func (h *TaskHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	commentID, _ := strconv.Atoi(idStr)

	query := "UPDATE comments SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL"

	result, err := h.DB.Exec(query, commentID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete comment: " + err.Error()})
		return
	}

	count, _ := result.RowsAffected()
	if count == 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Comment not found or already deleted"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
