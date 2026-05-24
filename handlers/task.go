package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"kanban/internal/utils"
	"kanban/middleware"

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

// GET /tasks?column_id=1&search=текст&page=1&limit=20&sort=priority&order=desc
func (h *TaskHandler) GetTasks(w http.ResponseWriter, r *http.Request) {
	colIDStr := r.URL.Query().Get("column_id")
	searchQuery := r.URL.Query().Get("search")
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")
	sortBy := r.URL.Query().Get("sort")
	sortOrder := r.URL.Query().Get("order")

	colID, err := strconv.Atoi(colIDStr)
	if err != nil {
		utils.LogError(err, "GetTasks: invalid column_id")
		sendError(w, "Некорректный ID колонки", http.StatusBadRequest)
		return
	}

	page := 1
	if pageStr != "" {
		page, _ = strconv.Atoi(pageStr)
	}
	limit := 20
	if limitStr != "" {
		limit, _ = strconv.Atoi(limitStr)
	}
	offset := (page - 1) * limit

	if sortBy == "" {
		sortBy = "position"
	}
	if sortOrder == "" {
		sortOrder = "ASC"
	}
	allowedSortFields := map[string]bool{
		"position": true, "priority": true, "deadline": true, "created_at": true, "title": true,
	}
	if !allowedSortFields[sortBy] {
		sortBy = "position"
	}
	if sortOrder != "ASC" && sortOrder != "DESC" {
		sortOrder = "ASC"
	}

	var total int
	err = h.DB.QueryRow(`
		SELECT COUNT(*) FROM tasks 
		WHERE column_id=$1 AND deleted_at IS NULL AND archived_at IS NULL AND title ILIKE $2
	`, colID, "%"+searchQuery+"%").Scan(&total)
	if err != nil {
		utils.LogError(err, "GetTasks: failed to count tasks")
		sendError(w, "Ошибка базы данных", http.StatusInternalServerError)
		return
	}

	query := fmt.Sprintf(`
		SELECT id, column_id, title, description, priority, position, done_at, deadline, created_at
		FROM tasks 
		WHERE column_id=$1 
			AND deleted_at IS NULL 
			AND archived_at IS NULL 
			AND title ILIKE $2
		ORDER BY %s %s
		LIMIT $3 OFFSET $4`, sortBy, sortOrder)

	rows, err := h.DB.Query(query, colID, "%"+searchQuery+"%", limit, offset)
	if err != nil {
		utils.LogError(err, "GetTasks: database query failed")
		sendError(w, "Ошибка базы данных: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	tasks := []TaskWithLabels{}
	for rows.Next() {
		var t Task
		var createdAt time.Time
		err := rows.Scan(&t.ID, &t.ColumnID, &t.Title, &t.Description, &t.Priority, &t.Position, &t.DoneAt, &t.Deadline, &createdAt)
		if err != nil {
			utils.LogError(err, "GetTasks: failed to scan row")
			continue
		}
		labels := h.getTaskLabels(t.ID)
		tasks = append(tasks, TaskWithLabels{
			Task:   t,
			Labels: labels,
		})
	}

	response := map[string]interface{}{
		"data": tasks,
		"meta": map[string]interface{}{
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": (total + limit - 1) / limit,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *TaskHandler) getTaskLabels(taskID int) []map[string]interface{} {
	rows, err := h.DB.Query(`
		SELECT l.id, l.name, l.color
		FROM task_labels tl
		JOIN labels l ON l.id = tl.label_id
		WHERE tl.task_id = $1 AND l.deleted_at IS NULL
	`, taskID)
	if err != nil {
		utils.LogError(err, fmt.Sprintf("getTaskLabels: failed for task %d", taskID))
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
		utils.LogError(err, "CreateTask: failed to decode request")
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
		utils.LogError(err, "CreateTask: failed to insert task")
		sendError(w, "Ошибка БД: "+err.Error(), http.StatusInternalServerError)
		return
	}

	t.ID = taskID
	utils.LogInfo(fmt.Sprintf("Task created: ID=%d, Title=%s", t.ID, t.Title))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

// DELETE /tasks/{id} — Мягкое удаление с транзакцией
func (h *TaskHandler) DeleteTask(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	taskID, _ := strconv.Atoi(idStr)

	tx, err := h.DB.Begin()
	if err != nil {
		utils.LogError(err, "DeleteTask: failed to begin transaction")
		sendError(w, "Transaction error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var columnID, position int
	err = tx.QueryRow("SELECT column_id, position FROM tasks WHERE id = $1 AND deleted_at IS NULL", taskID).Scan(&columnID, &position)
	if err != nil {
		sendError(w, "Задача не найдена", http.StatusNotFound)
		return
	}

	result, err := tx.Exec("UPDATE tasks SET deleted_at = NOW() WHERE id = $1", taskID)
	if err != nil {
		utils.LogError(err, "DeleteTask: failed to delete task")
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		sendError(w, "Задача не найдена", http.StatusNotFound)
		return
	}

	_, err = tx.Exec(`
		UPDATE tasks SET position = position - 1 
		WHERE column_id = $1 AND position > $2 AND deleted_at IS NULL
	`, columnID, position)

	if err != nil {
		utils.LogError(err, "DeleteTask: failed to update positions")
		sendError(w, "Failed to update positions", http.StatusInternalServerError)
		return
	}

	err = tx.Commit()
	if err != nil {
		utils.LogError(err, "DeleteTask: failed to commit transaction")
		sendError(w, "Transaction commit error", http.StatusInternalServerError)
		return
	}

	utils.LogInfo(fmt.Sprintf("Task deleted: ID=%d", taskID))
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status": "deleted"}`))
}

// PATCH /tasks/{id}/restore — Восстановление с транзакцией
func (h *TaskHandler) RestoreTask(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	taskID, _ := strconv.Atoi(idStr)

	tx, err := h.DB.Begin()
	if err != nil {
		utils.LogError(err, "RestoreTask: failed to begin transaction")
		sendError(w, "Transaction error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var columnID int
	err = tx.QueryRow("SELECT column_id FROM tasks WHERE id = $1 AND deleted_at IS NOT NULL", taskID).Scan(&columnID)
	if err != nil {
		sendError(w, "Задача не найдена в корзине", http.StatusNotFound)
		return
	}

	var maxPos int
	tx.QueryRow("SELECT COALESCE(MAX(position), 0) FROM tasks WHERE column_id = $1 AND deleted_at IS NULL", columnID).Scan(&maxPos)

	_, err = tx.Exec(`
		UPDATE tasks 
		SET deleted_at = NULL, position = $1 
		WHERE id = $2
	`, maxPos+1, taskID)

	if err != nil {
		utils.LogError(err, "RestoreTask: failed to restore task")
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = tx.Commit()
	if err != nil {
		utils.LogError(err, "RestoreTask: failed to commit transaction")
		sendError(w, "Transaction commit error", http.StatusInternalServerError)
		return
	}

	utils.LogInfo(fmt.Sprintf("Task restored: ID=%d", taskID))
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status": "restored"}`))
}

// PATCH /tasks/{id}/archive — Архивация
func (h *TaskHandler) ArchiveTask(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	taskID, _ := strconv.Atoi(idStr)

	_, err := h.DB.Exec("UPDATE tasks SET archived_at = NOW() WHERE id = $1", taskID)
	if err != nil {
		utils.LogError(err, fmt.Sprintf("ArchiveTask: failed to archive task %d", taskID))
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	utils.LogInfo(fmt.Sprintf("Task archived: ID=%d", taskID))
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status": "archived"}`))
}

// PUT /tasks/{id} — Обновление задачи с транзакцией
func (h *TaskHandler) UpdateTask(w http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	taskID, _ := strconv.Atoi(idStr)

	var t Task
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		utils.LogError(err, "UpdateTask: failed to decode request")
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

	tx, err := h.DB.Begin()
	if err != nil {
		utils.LogError(err, "UpdateTask: failed to begin transaction")
		sendError(w, "Transaction error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var oldColumnID, oldPosition int
	err = tx.QueryRow("SELECT column_id, position FROM tasks WHERE id = $1 AND deleted_at IS NULL", taskID).Scan(&oldColumnID, &oldPosition)
	if err != nil {
		utils.LogError(err, "UpdateTask: failed to get old task data")
		sendError(w, "Task not found", http.StatusNotFound)
		return
	}

	newColumnID := t.ColumnID
	newPosition := t.Position

	if newColumnID != 0 && newColumnID != oldColumnID {
		_, err = tx.Exec(`
			UPDATE tasks SET position = position - 1 
			WHERE column_id = $1 AND position > $2 AND deleted_at IS NULL
		`, oldColumnID, oldPosition)
		if err != nil {
			utils.LogError(err, "UpdateTask: failed to update old column positions")
			sendError(w, "Database error", http.StatusInternalServerError)
			return
		}

		var maxPos int
		tx.QueryRow("SELECT COALESCE(MAX(position), 0) FROM tasks WHERE column_id = $1 AND deleted_at IS NULL", newColumnID).Scan(&maxPos)
		newPosition = maxPos + 1
	} else if newPosition != 0 && newPosition != oldPosition {
		if newPosition > oldPosition {
			_, err = tx.Exec(`
				UPDATE tasks SET position = position - 1 
				WHERE column_id = $1 AND position > $2 AND position <= $3 AND deleted_at IS NULL
			`, oldColumnID, oldPosition, newPosition)
		} else {
			_, err = tx.Exec(`
				UPDATE tasks SET position = position + 1 
				WHERE column_id = $1 AND position >= $2 AND position < $3 AND deleted_at IS NULL
			`, oldColumnID, newPosition, oldPosition)
		}
		if err != nil {
			utils.LogError(err, "UpdateTask: failed to update positions")
			sendError(w, "Database error", http.StatusInternalServerError)
			return
		}
	}

	updateColumnID := newColumnID
	if updateColumnID == 0 {
		updateColumnID = oldColumnID
	}
	finalPosition := newPosition
	if finalPosition == 0 {
		finalPosition = oldPosition
	}

	query := `
		UPDATE tasks 
		SET title = COALESCE(NULLIF($1, ''), title),
			description = COALESCE(NULLIF($2, ''), description),
			priority = COALESCE(NULLIF($3, ''), priority),
			column_id = $4,
			position = $5,
			deadline = $6,
			updated_at = NOW()
		WHERE id = $7`

	_, err = tx.Exec(query,
		t.Title, t.Description, t.Priority,
		updateColumnID, finalPosition, t.Deadline, taskID)

	if err != nil {
		utils.LogError(err, "UpdateTask: failed to update task")
		sendError(w, "SQL Error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	err = tx.Commit()
	if err != nil {
		utils.LogError(err, "UpdateTask: failed to commit transaction")
		sendError(w, "Transaction commit error", http.StatusInternalServerError)
		return
	}

	utils.LogInfo(fmt.Sprintf("Task updated: ID=%d", taskID))
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
		utils.LogError(err, "AddLabelToTask: failed to decode request")
		sendError(w, "invalid request", http.StatusBadRequest)
		return
	}

	_, err := h.DB.Exec(`
		INSERT INTO task_labels (task_id, label_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, taskID, req.LabelID)

	if err != nil {
		utils.LogError(err, fmt.Sprintf("AddLabelToTask: failed for task %s", taskID))
		sendError(w, "failed to add label", http.StatusInternalServerError)
		return
	}

	utils.LogInfo(fmt.Sprintf("Label %d added to task %s", req.LabelID, taskID))
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
		utils.LogError(err, fmt.Sprintf("RemoveLabelFromTask: failed for task %s, label %s", taskID, labelID))
		sendError(w, "failed to remove label", http.StatusInternalServerError)
		return
	}

	utils.LogInfo(fmt.Sprintf("Label %s removed from task %s", labelID, taskID))
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
		utils.LogError(err, fmt.Sprintf("GetTaskLabels: failed for task %s", taskID))
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

// ==================== АРХИВ И КОРЗИНА ====================

// GET /tasks/archive - получить все удалённые задачи
func (h *TaskHandler) GetArchivedTasks(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	rows, err := h.DB.Query(`
		SELECT t.id, t.title, t.description, t.priority, t.deleted_at, b.title as board_title
		FROM tasks t
		JOIN columns c ON c.id = t.column_id
		JOIN boards b ON b.id = c.board_id
		WHERE t.deleted_at IS NOT NULL
			AND (b.owner_id = $1 OR EXISTS (
				SELECT 1 FROM board_members WHERE board_id = b.id AND user_id = $1
			))
		ORDER BY t.deleted_at DESC
	`, userID)

	if err != nil {
		utils.LogError(err, "GetArchivedTasks: failed to query")
		sendError(w, "Ошибка базы данных", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type ArchivedTask struct {
		ID          int    `json:"id"`
		Title       string `json:"title"`
		Description string `json:"description"`
		Priority    string `json:"priority"`
		DeletedAt   string `json:"deleted_at"`
		BoardTitle  string `json:"board_title"`
	}

	tasks := []ArchivedTask{}
	for rows.Next() {
		var t ArchivedTask
		err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Priority, &t.DeletedAt, &t.BoardTitle)
		if err != nil {
			continue
		}
		tasks = append(tasks, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}

// DELETE /tasks/{id}/permanent - полное удаление задачи
func (h *TaskHandler) PermanentDeleteTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	taskID := vars["id"]

	var deletedAt sql.NullString
	err := h.DB.QueryRow("SELECT deleted_at FROM tasks WHERE id = $1", taskID).Scan(&deletedAt)
	if err != nil {
		sendError(w, "Задача не найдена", http.StatusNotFound)
		return
	}

	if !deletedAt.Valid {
		sendError(w, "Сначала нужно мягко удалить задачу", http.StatusBadRequest)
		return
	}

	_, err = h.DB.Exec("DELETE FROM tasks WHERE id = $1", taskID)
	if err != nil {
		utils.LogError(err, "PermanentDeleteTask: failed to delete")
		sendError(w, "Ошибка удаления", http.StatusInternalServerError)
		return
	}

	utils.LogInfo(fmt.Sprintf("Task permanently deleted: ID=%s", taskID))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Task permanently deleted"})
}

// DELETE /tasks/archive/clean - очистить корзину
func (h *TaskHandler) CleanTrash(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	result, err := h.DB.Exec(`
		DELETE FROM tasks
		WHERE deleted_at IS NOT NULL
			AND column_id IN (
				SELECT c.id FROM columns c
				JOIN boards b ON b.id = c.board_id
				WHERE b.owner_id = $1 OR EXISTS (
					SELECT 1 FROM board_members WHERE board_id = b.id AND user_id = $1
				)
			)
	`, userID)

	if err != nil {
		utils.LogError(err, "CleanTrash: failed to clean")
		sendError(w, "Ошибка очистки", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	utils.LogInfo(fmt.Sprintf("Trash cleaned: %d tasks deleted", rowsAffected))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":       "Trash cleaned successfully",
		"deleted_count": rowsAffected,
	})
}
