package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	// "regexp"
	"strconv"
	"time"

	"kanban/middleware" // ВНИМАНИЕ: Убедись, что этот путь импорта совпадает с твоим названием модуля в go.mod

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

// ==========================================
//   ФУНКЦИИ АКЫЛАЙ (АДАПТИРОВАНЫ ПОД БД)
// ==========================================

// GET /boards/{id} — получить один проект по ID
func (h *BoardHandler) GetBoard(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	vars := mux.Vars(r)
	boardID := vars["id"]

	var b Board
	// Проверяем, существует ли доска, не удалена ли она и имеет ли пользователь к ней доступ
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

// PUT /boards/{id} — обновить данные проекта
func (h *BoardHandler) UpdateBoard(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	vars := mux.Vars(r)
	boardID := vars["id"]

	var input Board
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	// Валидация входных данных
	if input.Title == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Title is required"})
		return
	}

	// Проверяем права (обновлять может только владелец доски или авторизованный участник)
	var isAllowed bool
	err := h.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM boards b
			LEFT JOIN board_members bm ON bm.board_id = b.id
			WHERE b.id=$1 AND (b.owner_id=$2 OR bm.user_id=$2) AND b.deleted_at IS NULL
		)
	`, boardID, userID).Scan(&isAllowed)

	if err != nil || !isAllowed {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Forbidden or board not found"})
		return
	}

	// Обновляем данные в БД
	_, err = h.DB.Exec(`
		UPDATE boards 
		SET title = $1, description = $2 
		WHERE id = $3 AND deleted_at IS NULL
	`, input.Title, input.Description, boardID)

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update board"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Board updated successfully"})
}

// ==========================================
//             ПОЛНЫЙ КОД АЛИИ
// ==========================================

// GET /boards — список проектов пользователя с пагинацией
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
	if len(b.Title) > 255 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "title too long (max 255 characters)"})
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

// DELETE /boards/{id} — soft delete проекта
func (h *BoardHandler) DeleteBoard(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	vars := mux.Vars(r)
	boardID := vars["id"]

	var exists bool
	err := h.DB.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM boards WHERE id=$1 AND deleted_at IS NULL)
	`, boardID).Scan(&exists)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "database error"})
		return
	}

	if !exists {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "board not found"})
		return
	}

	var ownerID int
	err = h.DB.QueryRow("SELECT owner_id FROM boards WHERE id=$1", boardID).Scan(&ownerID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	if ownerID != userID {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "only owner can delete"})
		return
	}

	_, err = h.DB.Exec(`UPDATE boards SET deleted_at = NOW() WHERE id=$1`, boardID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "failed to delete board"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Board deleted"})
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

// POST /boards/{id}/members — добавление пользователя в доску (назначение роли)
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
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid request"})
		return
	}

	if req.UserID == userID {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "cannot add yourself as member"})
		return
	}

	var ownerID int
	err := h.DB.QueryRow("SELECT owner_id FROM boards WHERE id=$1", boardID).Scan(&ownerID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "board not found"})
		return
	}

	if ownerID != userID {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "only owner can add members"})
		return
	}

	_, err = h.DB.Exec(`
		INSERT INTO board_members (board_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
	`, boardID, req.UserID, req.Role)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "failed to add member"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "member added"})
}

// POST /boards/{id}/invite — приглашение по email (Доп. функция Алии)
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
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid request"})
		return
	}

	if req.Email == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "email is required"})
		return
	}

	if !ValidateEmail(req.Email) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid email format"})
		return
	}

	var ownerID int
	err := h.DB.QueryRow("SELECT owner_id FROM boards WHERE id=$1", boardID).Scan(&ownerID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "board not found"})
		return
	}

	if ownerID != userID {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "only owner can invite members"})
		return
	}

	token := fmt.Sprintf("%d_%s", time.Now().UnixNano(), randomString(16))

	_, err = h.DB.Exec(`
		INSERT INTO invitations (board_id, invited_email, invited_by, token, role, expires_at)
		VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
	`, boardID, req.Email, userID, token, req.Role)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "failed to create invitation"})
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

// ==========================================
//          ВСПOMОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
	}
	return string(b)
}

// // Валидация Email регулярным выражением
// func ValidateEmail(email string) bool {
// 	re := regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,4}$`)
// 	return re.MatchString(email)
// }

// package handlers

// import (
// 	"database/sql"
// 	"encoding/json"
// 	"fmt"
// 	"net/http"
// 	"strconv"
// 	"time"

// 	"kanban/middleware"

// 	"github.com/gorilla/mux"
// )

// type Board struct {
// 	ID          int    `json:"id"`
// 	Title       string `json:"title"`
// 	Description string `json:"description"`
// }

// type BoardHandler struct {
// 	DB *sql.DB
// }

// // GET /boards?page=1&limit=10
// func (h *BoardHandler) GetBoards(w http.ResponseWriter, r *http.Request) {
// 	userID := r.Context().Value(middleware.UserIDKey).(int)

// 	// Параметры пагинации
// 	pageStr := r.URL.Query().Get("page")
// 	limitStr := r.URL.Query().Get("limit")

// 	page := 1
// 	if pageStr != "" {
// 		page, _ = strconv.Atoi(pageStr)
// 	}
// 	limit := 10
// 	if limitStr != "" {
// 		limit, _ = strconv.Atoi(limitStr)
// 	}
// 	offset := (page - 1) * limit

// 	// Подсчет общего количества
// 	var total int
// 	err := h.DB.QueryRow(`
// 		SELECT COUNT(DISTINCT b.id)
// 		FROM boards b
// 		LEFT JOIN board_members bm ON bm.board_id = b.id
// 		WHERE (b.owner_id=$1 OR bm.user_id=$1) AND b.deleted_at IS NULL
// 	`, userID).Scan(&total)

// 	if err != nil {
// 		http.Error(w, err.Error(), 500)
// 		return
// 	}

// 	// Основной запрос с пагинацией
// 	rows, err := h.DB.Query(`
// 		SELECT DISTINCT b.id, b.title, b.description
// 		FROM boards b
// 		LEFT JOIN board_members bm ON bm.board_id = b.id
// 		WHERE (b.owner_id=$1 OR bm.user_id=$1) AND b.deleted_at IS NULL
// 		ORDER BY b.id
// 		LIMIT $2 OFFSET $3
// 	`, userID, limit, offset)

// 	if err != nil {
// 		http.Error(w, err.Error(), 500)
// 		return
// 	}
// 	defer rows.Close()

// 	boards := []Board{}
// 	for rows.Next() {
// 		var b Board
// 		err := rows.Scan(&b.ID, &b.Title, &b.Description)
// 		if err != nil {
// 			http.Error(w, err.Error(), 500)
// 			return
// 		}
// 		boards = append(boards, b)
// 	}

// 	// Ответ с мета-информацией
// 	response := map[string]interface{}{
// 		"data": boards,
// 		"meta": map[string]interface{}{
// 			"total":      total,
// 			"page":       page,
// 			"limit":      limit,
// 			"totalPages": (total + limit - 1) / limit,
// 		},
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(response)
// }

// // POST /boards
// func (h *BoardHandler) CreateBoard(w http.ResponseWriter, r *http.Request) {
// 	userID := r.Context().Value(middleware.UserIDKey).(int)

// 	var b Board
// 	err := json.NewDecoder(r.Body).Decode(&b)
// 	if err != nil {
// 		http.Error(w, `{"error": "invalid request"}`, http.StatusBadRequest)
// 		return
// 	}

// 	if b.Title == "" {
// 		http.Error(w, `{"error": "title is required"}`, http.StatusBadRequest)
// 		return
// 	}
// 	if len(b.Title) > 255 {
// 		http.Error(w, `{"error": "title too long (max 255 characters)"}`, http.StatusBadRequest)
// 		return
// 	}

// 	var boardID int
// 	err = h.DB.QueryRow(`
// 		INSERT INTO boards (title, description, owner_id)
// 		VALUES ($1, $2, $3)
// 		RETURNING id
// 	`, b.Title, b.Description, userID).Scan(&boardID)

// 	if err != nil {
// 		http.Error(w, `{"error": "failed to create board"}`, http.StatusInternalServerError)
// 		return
// 	}

// 	_, _ = h.DB.Exec(`
// 		INSERT INTO board_members (board_id, user_id, role)
// 		VALUES ($1, $2, 'owner')
// 	`, boardID, userID)

// 	w.Header().Set("Content-Type", "application/json")
// 	w.WriteHeader(http.StatusCreated)
// 	json.NewEncoder(w).Encode(map[string]int{
// 		"id": boardID,
// 	})
// }

// // DELETE /boards/:id
// func (h *BoardHandler) DeleteBoard(w http.ResponseWriter, r *http.Request) {
// 	userID := r.Context().Value(middleware.UserIDKey).(int)
// 	vars := mux.Vars(r)
// 	boardID := vars["id"]

// 	var exists bool
// 	err := h.DB.QueryRow(`
// 		SELECT EXISTS(SELECT 1 FROM boards WHERE id=$1 AND deleted_at IS NULL)
// 	`, boardID).Scan(&exists)

// 	if err != nil {
// 		http.Error(w, `{"error": "database error"}`, http.StatusInternalServerError)
// 		return
// 	}

// 	if !exists {
// 		http.Error(w, `{"error": "board not found"}`, http.StatusNotFound)
// 		return
// 	}

// 	var ownerID int
// 	err = h.DB.QueryRow(`SELECT owner_id FROM boards WHERE id=$1`, boardID).Scan(&ownerID)
// 	if err != nil {
// 		http.Error(w, `{"error": "board not found"}`, http.StatusNotFound)
// 		return
// 	}

// 	if ownerID != userID {
// 		http.Error(w, `{"error": "only owner can delete"}`, http.StatusForbidden)
// 		return
// 	}

// 	_, err = h.DB.Exec(`UPDATE boards SET deleted_at = NOW() WHERE id=$1`, boardID)
// 	if err != nil {
// 		http.Error(w, `{"error": "failed to delete board"}`, http.StatusInternalServerError)
// 		return
// 	}

// 	w.WriteHeader(http.StatusOK)
// 	json.NewEncoder(w).Encode(map[string]string{"message": "Board deleted"})
// }

// // GET /boards/:id/members
// func (h *BoardHandler) GetMembers(w http.ResponseWriter, r *http.Request) {
// 	userID := r.Context().Value(middleware.UserIDKey).(int)
// 	vars := mux.Vars(r)
// 	boardID := vars["id"]

// 	var exists int
// 	err := h.DB.QueryRow(`
// 		SELECT 1
// 		FROM boards b
// 		LEFT JOIN board_members bm ON bm.board_id = b.id
// 		WHERE b.id=$1 AND (b.owner_id=$2 OR bm.user_id=$2)
// 	`, boardID, userID).Scan(&exists)

// 	if err != nil {
// 		http.Error(w, "Access denied", 403)
// 		return
// 	}

// 	rows, err := h.DB.Query(`
// 		SELECT u.id, u.name, bm.role
// 		FROM board_members bm
// 		JOIN users u ON u.id = bm.user_id
// 		WHERE bm.board_id=$1
// 	`, boardID)

// 	if err != nil {
// 		http.Error(w, err.Error(), 500)
// 		return
// 	}
// 	defer rows.Close()

// 	type Member struct {
// 		ID   int    `json:"id"`
// 		Name string `json:"name"`
// 		Role string `json:"role"`
// 	}

// 	members := []Member{}
// 	for rows.Next() {
// 		var m Member
// 		err := rows.Scan(&m.ID, &m.Name, &m.Role)
// 		if err != nil {
// 			http.Error(w, err.Error(), 500)
// 			return
// 		}
// 		members = append(members, m)
// 	}

// 	json.NewEncoder(w).Encode(members)
// }

// // POST /boards/:id/members
// func (h *BoardHandler) AddMemberToBoard(w http.ResponseWriter, r *http.Request) {
// 	userID := r.Context().Value(middleware.UserIDKey).(int)
// 	vars := mux.Vars(r)
// 	boardID := vars["id"]

// 	var req struct {
// 		UserID int    `json:"user_id"`
// 		Role   string `json:"role"`
// 	}

// 	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
// 		http.Error(w, `{"error": "invalid request"}`, http.StatusBadRequest)
// 		return
// 	}

// 	if req.UserID == userID {
// 		http.Error(w, `{"error": "cannot add yourself as member"}`, http.StatusBadRequest)
// 		return
// 	}

// 	var ownerID int
// 	err := h.DB.QueryRow("SELECT owner_id FROM boards WHERE id=$1", boardID).Scan(&ownerID)
// 	if err != nil {
// 		http.Error(w, `{"error": "board not found"}`, http.StatusNotFound)
// 		return
// 	}

// 	if ownerID != userID {
// 		http.Error(w, `{"error": "only owner can add members"}`, http.StatusForbidden)
// 		return
// 	}

// 	_, err = h.DB.Exec(`
// 		INSERT INTO board_members (board_id, user_id, role)
// 		VALUES ($1, $2, $3)
// 		ON CONFLICT DO NOTHING
// 	`, boardID, req.UserID, req.Role)

// 	if err != nil {
// 		http.Error(w, `{"error": "failed to add member"}`, http.StatusInternalServerError)
// 		return
// 	}

// 	w.WriteHeader(http.StatusOK)
// 	json.NewEncoder(w).Encode(map[string]string{"message": "member added"})
// }

// // InviteByEmail - приглашение по email
// func (h *BoardHandler) InviteByEmail(w http.ResponseWriter, r *http.Request) {
// 	userID := r.Context().Value(middleware.UserIDKey).(int)
// 	vars := mux.Vars(r)
// 	boardID := vars["id"]

// 	var req struct {
// 		Email string `json:"email"`
// 		Role  string `json:"role"`
// 	}

// 	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
// 		http.Error(w, `{"error": "invalid request"}`, http.StatusBadRequest)
// 		return
// 	}

// 	if req.Email == "" {
// 		http.Error(w, `{"error": "email is required"}`, http.StatusBadRequest)
// 		return
// 	}

// 	if !ValidateEmail(req.Email) {
// 		http.Error(w, `{"error": "invalid email format"}`, http.StatusBadRequest)
// 		return
// 	}

// 	var ownerID int
// 	err := h.DB.QueryRow("SELECT owner_id FROM boards WHERE id=$1", boardID).Scan(&ownerID)
// 	if err != nil {
// 		http.Error(w, `{"error": "board not found"}`, http.StatusNotFound)
// 		return
// 	}

// 	if ownerID != userID {
// 		http.Error(w, `{"error": "only owner can invite members"}`, http.StatusForbidden)
// 		return
// 	}

// 	token := fmt.Sprintf("%d_%s", time.Now().UnixNano(), randomString(16))

// 	_, err = h.DB.Exec(`
// 		INSERT INTO invitations (board_id, invited_email, invited_by, token, role, expires_at)
// 		VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
// 	`, boardID, req.Email, userID, token, req.Role)

// 	if err != nil {
// 		http.Error(w, `{"error": "failed to create invitation"}`, http.StatusInternalServerError)
// 		return
// 	}

// 	inviteLink := "http://localhost:8080/accept-invite?token=" + token

// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"message": "Invitation created",
// 		"token":   token,
// 		"link":    inviteLink,
// 	})
// }

// func randomString(n int) string {
// 	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
// 	b := make([]byte, n)
// 	for i := range b {
// 		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
// 	}
// 	return string(b)
// }
