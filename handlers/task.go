package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
)

type Task struct {
	ID          int     `json:"id"`
	ColumnID    int     `json:"column_id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Priority    string  `json:"priority"`
	Position    int     `json:"position"`
	AssignedTo  int     `json:"assigned_to"`
	Deadline    *string `json:"deadline"`
	DeletedAt   *string `json:"deleted_at"`
	ArchivedAt  *string `json:"archived_at"`
	DoneAt      *string `json:"done_at"`
}

type TaskWithLabels struct {
	Task
	Labels []map[string]interface{} `json:"labels"`
}

type TaskHandler struct {
	DB *sql.DB
}

func sendError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func ValidatePriority(priority string) bool {
	priority = strings.ToLower(priority)
	return priority == "high" || priority == "medium" || priority == "low"
}

func ValidateTitle(title string) bool {
	if title == "" {
		return false
	}
	return len(title) <= 255
}

func validateDeadline(deadline string) bool {
	if deadline == "" {
		return true
	}
	parts := strings.Split(deadline, " ")
	if len(parts) != 2 {
		return false
	}
	dateParts := strings.Split(parts[0], "-")
	if len(dateParts) != 3 {
		return false
	}
	timeParts := strings.Split(parts[1], ":")
	if len(timeParts) != 3 {
		return false
	}
	return true
}

const doneColumnID = 3

// GET /tasks?column_id=1&search=текст
func (h *TaskHandler) GetTasks(w http.ResponseWriter, r *http.Request) {
	colIDStr := r.URL.Query().Get("column_id")
	searchQuery := r.URL.Query().Get("search")

	colID, err := strconv.Atoi(colIDStr)
	if err != nil {
		sendError(w, "Некорректный ID колонки", http.StatusBadRequest)
		return
	}

	query := `
		SELECT id, column_id, title, description, priority, position, done_at, deadline
		FROM tasks 
		WHERE column_id=$1 
			AND deleted_at IS NULL 
			AND archived_at IS NULL 
			AND title ILIKE $2
		ORDER BY position ASC`

	rows, err := h.DB.Query(query, colID, "%"+searchQuery+"%")
	if err != nil {
		sendError(w, "Ошибка базы данных: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	tasks := []TaskWithLabels{}
	for rows.Next() {
		var t Task
		err := rows.Scan(&t.ID, &t.ColumnID, &t.Title, &t.Description, &t.Priority, &t.Position, &t.DoneAt, &t.Deadline)
		if err != nil {
			continue
		}

		// Получаем метки для задачи
		labels := h.getTaskLabels(t.ID)

		tasks = append(tasks, TaskWithLabels{
			Task:   t,
			Labels: labels,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}

// getTaskLabels - вспомогательная функция для получения меток задачи
func (h *TaskHandler) getTaskLabels(taskID int) []map[string]interface{} {
	rows, err := h.DB.Query(`
		SELECT l.id, l.name, l.color
		FROM task_labels tl
		JOIN labels l ON l.id = tl.label_id
		WHERE tl.task_id = $1 AND l.deleted_at IS NULL
	`, taskID)
	if err != nil {
		return []map[string]interface{}{}
	}
	defer rows.Close()

	var labels []map[string]interface{}
	for rows.Next() {
		var id int
		var name, color string
		rows.Scan(&id, &name, &color)
		labels = append(labels, map[string]interface{}{
			"id":    id,
			"name":  name,
			"color": color,
		})
	}
	return labels
}

// POST /tasks — Создать задачу
func (h *TaskHandler) CreateTask(w http.ResponseWriter, r *http.Request) {
	var t Task
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		sendError(w, "Некорректный формат JSON", http.StatusBadRequest)
		return
	}

	if !ValidateTitle(t.Title) {
		sendError(w, "Название задачи не может быть пустым и должно быть не более 255 символов", http.StatusBadRequest)
		return
	}

	if t.Priority != "" && !ValidatePriority(t.Priority) {
		sendError(w, "Приоритет должен быть: high, medium или low", http.StatusBadRequest)
		return
	}

	if t.Deadline != nil && *t.Deadline != "" && !validateDeadline(*t.Deadline) {
		sendError(w, "Неверный формат даты. Используйте YYYY-MM-DD HH:MM:SS", http.StatusBadRequest)
		return
	}

	if t.Priority == "" {
		t.Priority = "medium"
	}

	var maxPos int
	h.DB.QueryRow("SELECT COALESCE(MAX(position), 0) FROM tasks WHERE column_id=$1", t.ColumnID).Scan(&maxPos)

	var err error
	var taskID int

	if t.Deadline != nil && *t.Deadline != "" {
		err = h.DB.QueryRow(`
			INSERT INTO tasks (column_id, title, description, priority, position, deadline)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id
		`, t.ColumnID, t.Title, t.Description, t.Priority, maxPos+1, t.Deadline).Scan(&taskID)
	} else {
		err = h.DB.QueryRow(`
			INSERT INTO tasks (column_id, title, description, priority, position)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id
		`, t.ColumnID, t.Title, t.Description, t.Priority, maxPos+1).Scan(&taskID)
	}

	if err != nil {
		sendError(w, "Ошибка БД: "+err.Error(), http.StatusInternalServerError)
		return
	}

	t.ID = taskID
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

// DELETE /tasks/{id} — Мягкое удаление
func (h *TaskHandler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	result, err := h.DB.Exec("UPDATE tasks SET deleted_at = NOW() WHERE id = $1", idStr)
	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		sendError(w, "Задача не найдена", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status": "deleted"}`))
}

// PATCH /tasks/{id}/restore — Восстановление
func (h *TaskHandler) RestoreTask(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	_, err := h.DB.Exec("UPDATE tasks SET deleted_at = NULL WHERE id = $1", idStr)
	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status": "restored"}`))
}

// PATCH /tasks/{id}/archive — Архивация
func (h *TaskHandler) ArchiveTask(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	_, err := h.DB.Exec("UPDATE tasks SET archived_at = NOW() WHERE id = $1", idStr)
	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status": "archived"}`))
}

// PUT /tasks/{id} — Обновление
func (h *TaskHandler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	taskID, _ := strconv.Atoi(idStr)

	var t Task
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		sendError(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if t.Title != "" && !ValidateTitle(t.Title) {
		sendError(w, "Название задачи не может быть пустым и должно быть не более 255 символов", http.StatusBadRequest)
		return
	}

	if t.Priority != "" && !ValidatePriority(t.Priority) {
		sendError(w, "Приоритет должен быть: high, medium или low", http.StatusBadRequest)
		return
	}

	if t.Deadline != nil && *t.Deadline != "" && !validateDeadline(*t.Deadline) {
		sendError(w, "Неверный формат даты. Используйте YYYY-MM-DD HH:MM:SS", http.StatusBadRequest)
		return
	}

	query := `
		UPDATE tasks 
		SET title = COALESCE(NULLIF($1, ''), title),
			description = COALESCE(NULLIF($2, ''), description),
			priority = COALESCE(NULLIF($3, ''), priority),
			column_id = COALESCE($4, column_id),
			position = COALESCE($5, position),
			deadline = $6,
			updated_at = NOW()
		WHERE id = $7`

	_, err := h.DB.Exec(query,
		t.Title,
		t.Description,
		t.Priority,
		t.ColumnID,
		t.Position,
		t.Deadline,
		taskID,
	)

	if err != nil {
		sendError(w, "SQL Error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

// POST /tasks/{id}/labels - добавить метку к задаче
func (h *TaskHandler) AddLabelToTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	taskID := vars["id"]

	var req struct {
		LabelID int `json:"label_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "invalid request", http.StatusBadRequest)
		return
	}

	_, err := h.DB.Exec(`
		INSERT INTO task_labels (task_id, label_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, taskID, req.LabelID)

	if err != nil {
		sendError(w, "failed to add label", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "label added"})
}

// DELETE /tasks/{id}/labels/{labelId} - удалить метку из задачи
func (h *TaskHandler) RemoveLabelFromTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	taskID := vars["id"]
	labelID := vars["labelId"]

	_, err := h.DB.Exec(`
		DELETE FROM task_labels WHERE task_id = $1 AND label_id = $2
	`, taskID, labelID)

	if err != nil {
		sendError(w, "failed to remove label", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "label removed"})
}

// GET /tasks/{id}/labels - получить все метки задачи
func (h *TaskHandler) GetTaskLabels(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	taskID := vars["id"]

	rows, err := h.DB.Query(`
		SELECT l.id, l.name, l.color
		FROM task_labels tl
		JOIN labels l ON l.id = tl.label_id
		WHERE tl.task_id = $1 AND l.deleted_at IS NULL
	`, taskID)

	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var labels []map[string]interface{}
	for rows.Next() {
		var id int
		var name, color string
		rows.Scan(&id, &name, &color)
		labels = append(labels, map[string]interface{}{
			"id":    id,
			"name":  name,
			"color": color,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(labels)
}
