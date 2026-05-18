package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"kanban/middleware"

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

// GET /boards
func (h *BoardHandler) GetBoards(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	rows, err := h.DB.Query(`
		SELECT DISTINCT b.id, b.title, b.description
		FROM boards b
		LEFT JOIN board_members bm ON bm.board_id = b.id
		WHERE (b.owner_id=$1 OR bm.user_id=$1)
		AND b.deleted_at IS NULL
	`, userID)

	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	boards := []Board{}

	for rows.Next() {
		var b Board
		err := rows.Scan(&b.ID, &b.Title, &b.Description)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		boards = append(boards, b)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(boards)
}

// POST /boards
func (h *BoardHandler) CreateBoard(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	var b Board
	err := json.NewDecoder(r.Body).Decode(&b)
	if err != nil {
		http.Error(w, `{"error": "invalid request"}`, http.StatusBadRequest)
		return
	}

	// Проверки
	if b.Title == "" {
		http.Error(w, `{"error": "title is required"}`, http.StatusBadRequest)
		return
	}
	if len(b.Title) > 255 {
		http.Error(w, `{"error": "title too long"}`, http.StatusBadRequest)
		return
	}

	var boardID int
	err = h.DB.QueryRow(`
		INSERT INTO boards (title, description, owner_id)
		VALUES ($1, $2, $3)
		RETURNING id
	`, b.Title, b.Description, userID).Scan(&boardID)

	if err != nil {
		http.Error(w, `{"error": "failed to create board"}`, http.StatusInternalServerError)
		return
	}

	_, _ = h.DB.Exec(`
		INSERT INTO board_members (board_id, user_id, role)
		VALUES ($1, $2, 'owner')
	`, boardID, userID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int{
		"id": boardID,
	})
}

// DELETE /boards/:id
func (h *BoardHandler) DeleteBoard(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	vars := mux.Vars(r)
	boardID := vars["id"]

	// Проверка существования
	var exists bool
	err := h.DB.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM boards WHERE id=$1 AND deleted_at IS NULL)
	`, boardID).Scan(&exists)

	if err != nil {
		http.Error(w, `{"error": "database error"}`, http.StatusInternalServerError)
		return
	}

	if !exists {
		http.Error(w, `{"error": "board not found"}`, http.StatusNotFound)
		return
	}

	var ownerID int
	err = h.DB.QueryRow(`SELECT owner_id FROM boards WHERE id=$1`, boardID).Scan(&ownerID)
	if err != nil {
		http.Error(w, `{"error": "board not found"}`, http.StatusNotFound)
		return
	}

	if ownerID != userID {
		http.Error(w, `{"error": "only owner can delete"}`, http.StatusForbidden)
		return
	}

	_, err = h.DB.Exec(`UPDATE boards SET deleted_at = NOW() WHERE id=$1`, boardID)
	if err != nil {
		http.Error(w, `{"error": "failed to delete board"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Board deleted"})
}

// GET /boards/:id/members
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
		http.Error(w, "Access denied", 403)
		return
	}

	rows, err := h.DB.Query(`
		SELECT u.id, u.name, bm.role
		FROM board_members bm
		JOIN users u ON u.id = bm.user_id
		WHERE bm.board_id=$1
	`, boardID)

	if err != nil {
		http.Error(w, err.Error(), 500)
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
			http.Error(w, err.Error(), 500)
			return
		}
		members = append(members, m)
	}

	json.NewEncoder(w).Encode(members)
}

// POST /boards/:id/members - ДОБАВЛЕНИЕ УЧАСТНИКА (ПЕРЕИМЕНОВАНО)
func (h *BoardHandler) AddMemberToBoard(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	vars := mux.Vars(r)
	boardID := vars["id"]

	var req struct {
		UserID int    `json:"user_id"`
		Role   string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid request"}`, http.StatusBadRequest)
		return
	}

	// Нельзя добавить себя
	if req.UserID == userID {
		http.Error(w, `{"error": "cannot add yourself as member"}`, http.StatusBadRequest)
		return
	}

	var ownerID int
	err := h.DB.QueryRow("SELECT owner_id FROM boards WHERE id=$1", boardID).Scan(&ownerID)
	if err != nil {
		http.Error(w, `{"error": "board not found"}`, http.StatusNotFound)
		return
	}

	if ownerID != userID {
		http.Error(w, `{"error": "only owner can add members"}`, http.StatusForbidden)
		return
	}

	_, err = h.DB.Exec(`
		INSERT INTO board_members (board_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
	`, boardID, req.UserID, req.Role)

	if err != nil {
		http.Error(w, `{"error": "failed to add member"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "member added"})
}

// InviteByEmail - приглашение по email
func (h *BoardHandler) InviteByEmail(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	vars := mux.Vars(r)
	boardID := vars["id"]

	var req struct {
		Email string `json:"email"`
		Role  string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid request"}`, http.StatusBadRequest)
		return
	}

	if req.Email == "" {
		http.Error(w, `{"error": "email is required"}`, http.StatusBadRequest)
		return
	}

	var ownerID int
	err := h.DB.QueryRow("SELECT owner_id FROM boards WHERE id=$1", boardID).Scan(&ownerID)
	if err != nil {
		http.Error(w, `{"error": "board not found"}`, http.StatusNotFound)
		return
	}

	if ownerID != userID {
		http.Error(w, `{"error": "only owner can invite members"}`, http.StatusForbidden)
		return
	}

	token := fmt.Sprintf("%d_%s", time.Now().UnixNano(), randomString(16))

	_, err = h.DB.Exec(`
		INSERT INTO invitations (board_id, invited_email, invited_by, token, role, expires_at)
		VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
	`, boardID, req.Email, userID, token, req.Role)

	if err != nil {
		http.Error(w, `{"error": "failed to create invitation"}`, http.StatusInternalServerError)
		return
	}

	inviteLink := "http://localhost:8080/accept-invite?token=" + token

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Invitation created",
		"token":   token,
		"link":    inviteLink,
	})
}

// randomString - генератор случайной строки для токена
func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
	}
	return string(b)
}
