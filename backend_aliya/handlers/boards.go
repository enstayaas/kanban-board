package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"kanban/internal/utils"
	"kanban/middleware" // Убедись, что путь совпадает с go.mod
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

type Board struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type BoardHandler struct {
	DB *sql.DB
}

// GET /boards/{id} — получить один проект по ID
func (h *BoardHandler) GetBoard(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	vars := mux.Vars(r)
	boardID := vars["id"]

	var b Board
	err := h.DB.QueryRow(`
		SELECT b.id, b.title, b.description
		FROM boards b
		LEFT JOIN board_members bm ON bm.board_id = b.id
		WHERE b.id=$1 AND (b.owner_id=$2 OR bm.user_id=$2) AND b.deleted_at IS NULL
	`, boardID, userID).Scan(&b.ID, &b.Title, &b.Description)

	if err == sql.ErrNoRows {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Board not found or access denied"})
		return
	} else if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(b)
}

// PUT /boards/{id} — обновить или ВОССТАНОВИТЬ проект из корзины
func (h *BoardHandler) UpdateBoard(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	vars := mux.Vars(r)
	boardID := vars["id"]

	var input map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	title, _ := input["title"].(string)
	description, _ := input["description"].(string)
	isArchivedReq, hasIsArchived := input["is_archived"]

	// Проверяем права владельца (работает как для активных, так и для мягко удаленных досок)
	var ownerID int
	err := h.DB.QueryRow("SELECT owner_id FROM boards WHERE id=$1", boardID).Scan(&ownerID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Board not found"})
		return
	}

	if ownerID != userID {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Forbidden"})
		return
	}

	// ЛОГИКА ВОССТАНОВЛЕНИЯ: Если фронтенд прислал {"is_archived": false}, убираем метку удаления
	if hasIsArchived && isArchivedReq == false {
		_, err = h.DB.Exec(`UPDATE boards SET deleted_at = NULL WHERE id = $1`, boardID)
	} else {
		// Обычное обновление активных данных
		if title == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Title is required"})
			return
		}
		_, err = h.DB.Exec(`
			UPDATE boards 
			SET title = $1, description = $2 
			WHERE id = $3 AND deleted_at IS NULL
		`, title, description, boardID)
	}

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update board"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Board updated successfully"})
}

// GET /boards — список АКТИВНЫХ проектов пользователя с пагинацией
func (h *BoardHandler) GetBoards(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1
	if pageStr != "" {
		page, _ = strconv.Atoi(pageStr)
	}
	limit := 10
	if limitStr != "" {
		limit, _ = strconv.Atoi(limitStr)
	}
	offset := (page - 1) * limit

	var total int
	err := h.DB.QueryRow(`
		SELECT COUNT(DISTINCT b.id)
		FROM boards b
		LEFT JOIN board_members bm ON bm.board_id = b.id
		WHERE (b.owner_id=$1 OR bm.user_id=$1) AND b.deleted_at IS NULL
	`, userID).Scan(&total)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	rows, err := h.DB.Query(`
		SELECT DISTINCT b.id, b.title, b.description
		FROM boards b
		LEFT JOIN board_members bm ON bm.board_id = b.id
		WHERE (b.owner_id=$1 OR bm.user_id=$1) AND b.deleted_at IS NULL
		ORDER BY b.id
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	boards := []Board{}
	for rows.Next() {
		var b Board
		err := rows.Scan(&b.ID, &b.Title, &b.Description)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		boards = append(boards, b)
	}

	response := map[string]interface{}{
		"data": boards,
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

// GET /boards/deleted — получить список УДАЛЕННЫХ досок (для Корзины)
func (h *BoardHandler) GetDeletedBoards(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Пользователь не авторизован"})
		return
	}

	rows, err := h.DB.Query(`
		SELECT id, title, description 
		FROM boards 
		WHERE owner_id = $1 AND deleted_at IS NOT NULL
		ORDER BY deleted_at DESC
	`, userID)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Ошибка БД: " + err.Error()})
		return
	}
	defer rows.Close()

	boards := []map[string]interface{}{}

	for rows.Next() {
		var id int
		var title string
		var description sql.NullString
		if err := rows.Scan(&id, &title, &description); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Ошибка Scan в Go: " + err.Error()})
			return
		}

		descStr := ""
		if description.Valid {
			descStr = description.String
		}

		board := map[string]interface{}{
			"id":          id,
			"title":       title,
			"description": descStr,
			"is_archived": true, // Свойство критично для фильтра в archive.html
		}
		boards = append(boards, board)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"data": boards})
}

// POST /boards — создание проекта
func (h *BoardHandler) CreateBoard(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	var b Board
	err := json.NewDecoder(r.Body).Decode(&b)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid request"})
		return
	}

	if b.Title == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "title is required"})
		return
	}

	var boardID int
	err = h.DB.QueryRow(`
		INSERT INTO boards (title, description, owner_id)
		VALUES ($1, $2, $3)
		RETURNING id
	`, b.Title, b.Description, userID).Scan(&boardID)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "failed to create board"})
		return
	}

	_, _ = h.DB.Exec(`
		INSERT INTO board_members (board_id, user_id, role)
		VALUES ($1, $2, 'owner')
	`, boardID, userID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int{"id": boardID})
}

// DELETE /boards/{id} — Мягкое удаление (Перемещение доски в корзину)
func (h *BoardHandler) DeleteBoard(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	boardID := vars["id"]

	// Перемещаем в корзину, выставляя текущее время в deleted_at
	_, err := h.DB.Exec(`UPDATE boards SET deleted_at = NOW() WHERE id=$1`, boardID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "failed to move board to trash"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Success"})
}

// DELETE /boards/{id}/permanent — Окончательное физическое удаление из БД (Кнопка в корзине)
// DELETE /boards/{id}/permanent — Окончательное физическое удаление из БД
// DELETE /boards/{id}/permanent — Полное удаление доски со встроенным обходом блокировок связей
// DELETE /boards/{id}/permanent — Окончательное физическое удаление из БД
func (h *BoardHandler) PermanentDeleteBoard(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	boardID := vars["id"]

	w.Header().Set("Content-Type", "application/json")
	utils.LogInfo("--- НАЧАЛО ТРАНЗАКЦИИ УДАЛЕНИЯ ДОСКИ ID: " + boardID + " ---")

	// Открываем транзакцию, чтобы всё выполнялось единым блоком
	tx, err := h.DB.Begin()
	if err != nil {
		utils.LogError(err, "Не удалось начать транзакцию удаления")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Ошибка инициализации удаления"})
		return
	}

	// В случае падения функции или непредвиденного выхода — откатываем изменения обратно
	defer tx.Rollback()

	// Шаг 1: Удаляем связи меток и задач (зависимая таблица)
	if _, err := tx.Exec(`
		DELETE FROM task_labels 
		WHERE task_id IN (SELECT id FROM tasks WHERE board_id = $1)
	`, boardID); err != nil {
		utils.LogError(err, "Ошибка на шаге 1: task_labels")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Ошибка при очистке связей меток задач"})
		return
	}

	// Шаг 2: Удаляем сами метки (родительская для task_labels, но зависимая для boards)
	if _, err := tx.Exec("DELETE FROM labels WHERE board_id = $1", boardID); err != nil {
		utils.LogError(err, "Ошибка на шаге 2: labels. Проверь структуру этой таблицы!")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Не удалось удалить метки доски из БД"})
		return
	}

	// Шаг 3: Комментарии к задачам этой доски
	if _, err := tx.Exec(`
		DELETE FROM comments 
		WHERE task_id IN (SELECT id FROM tasks WHERE board_id = $1)
	`, boardID); err != nil {
		utils.LogError(err, "Ошибка на шаге 3: comments")
	}

	// Шаг 4: Подзадачи
	if _, err := tx.Exec(`
		DELETE FROM subtasks 
		WHERE task_id IN (SELECT id FROM tasks WHERE board_id = $1)
	`, boardID); err != nil {
		utils.LogError(err, "Ошибка на шаге 4: subtasks")
	}

	// Шаг 5: Задачи (теперь их можно безопасно удалять, связи с метками уже стерты)
	if _, err := tx.Exec("DELETE FROM tasks WHERE board_id = $1", boardID); err != nil {
		utils.LogError(err, "Ошибка на шаге 5: tasks")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Ошибка при удалении задач"})
		return
	}

	// Шаг 6: Колонки доски
	if _, err := tx.Exec("DELETE FROM columns WHERE board_id = $1", boardID); err != nil {
		utils.LogError(err, "Ошибка на шаге 6: columns")
	}

	// Шаг 7: Участники доски
	if _, err := tx.Exec("DELETE FROM board_members WHERE board_id = $1", boardID); err != nil {
		utils.LogError(err, "Ошибка на шаге 7: board_members")
	}

	// Шаг 8: Логи активности, истории и аудита
	_, _ = tx.Exec("DELETE FROM activities WHERE board_id = $1", boardID)
	_, _ = tx.Exec("DELETE FROM board_activities WHERE board_id = $1", boardID)
	_, _ = tx.Exec("DELETE FROM history WHERE board_id = $1", boardID)

	// Шаг 9: Приглашения
	if _, err := tx.Exec("DELETE FROM invitations WHERE board_id = $1", boardID); err != nil {
		utils.LogError(err, "Ошибка на шаге 9: invitations")
	}

	// Финал: Удаляем саму запись доски, когда абсолютно все зависимости очищены
	result, err := tx.Exec("DELETE FROM boards WHERE id = $1", boardID)
	if err != nil {
		utils.LogError(err, "Ошибка на финальном шаге: boards")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "База данных заблокировала удаление доски: " + err.Error()})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Доска не найдена или уже была удалена"})
		return
	}

	// Если ни один шаг не выбросил ошибку — фиксируем изменения в БД окончательно
	if err := tx.Commit(); err != nil {
		utils.LogError(err, "Не удалось применить (Commit) транзакцию удаления")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Ошибка сохранения изменений в БД"})
		return
	}

	utils.LogInfo(fmt.Sprintf("⚡ Доска и все её связи успешно удалены из БД: ID=%s", boardID))
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Доска и всё её содержимое успешно удалены"})
}

// GET /boards/{id}/members — получение списка участников доски
func (h *BoardHandler) GetMembers(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	vars := mux.Vars(r)
	boardID := vars["id"]

	var exists int
	err := h.DB.QueryRow(`
		SELECT 1
		FROM boards b
		LEFT JOIN board_members bm ON bm.board_id = b.id
		WHERE b.id=$1 AND (b.owner_id=$2 OR bm.user_id=$2)
	`, boardID, userID).Scan(&exists)

	if err != nil {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte("Access denied"))
		return
	}

	rows, err := h.DB.Query(`
		SELECT u.id, u.name, bm.role
		FROM board_members bm
		JOIN users u ON u.id = bm.user_id
		WHERE bm.board_id=$1
	`, boardID)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Member struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
		Role string `json:"role"`
	}

	members := []Member{}
	for rows.Next() {
		var m Member
		err := rows.Scan(&m.ID, &m.Name, &m.Role)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		members = append(members, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(members)
}

// POST /boards/{id}/members — добавление пользователя в доску
func (h *BoardHandler) AddMemberToBoard(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	vars := mux.Vars(r)
	boardID := vars["id"]

	var req struct {
		UserID int    `json:"user_id"`
		Role   string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if req.UserID == userID {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var ownerID int
	err := h.DB.QueryRow("SELECT owner_id FROM boards WHERE id=$1", boardID).Scan(&ownerID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	if ownerID != userID {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	_, err = h.DB.Exec(`
		INSERT INTO board_members (board_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
	`, boardID, req.UserID, req.Role)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "member added"})
}

// POST /boards/{id}/invite — приглашение по email
func (h *BoardHandler) InviteByEmail(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	vars := mux.Vars(r)
	boardID := vars["id"]

	var req struct {
		Email string `json:"email"`
		Role  string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var ownerID int
	err := h.DB.QueryRow("SELECT owner_id FROM boards WHERE id=$1", boardID).Scan(&ownerID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	if ownerID != userID {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	token := fmt.Sprintf("%d_%s", time.Now().UnixNano(), randomString(16))

	_, err = h.DB.Exec(`
		INSERT INTO invitations (board_id, invited_email, invited_by, token, role, expires_at)
		VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
	`, boardID, req.Email, userID, token, req.Role)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	inviteLink := "http://localhost:8081/accept-invite?token=" + token

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Invitation created",
		"token":   token,
		"link":    inviteLink,
	})
}

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
	}
	return string(b)
}
