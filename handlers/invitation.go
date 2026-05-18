package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"kanban/middleware"
)

type InvitationHandler struct {
	DB *sql.DB
}

// AcceptInvite - принять приглашение
func (h *InvitationHandler) AcceptInvite(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")

	// Валидация токена
	if token == "" {
		http.Error(w, `{"error": "token is required"}`, http.StatusBadRequest)
		return
	}

	if len(token) < 10 {
		http.Error(w, `{"error": "invalid token format"}`, http.StatusBadRequest)
		return
	}

	// Проверяем приглашение
	var invitation struct {
		ID           int
		BoardID      int
		InvitedEmail string
		Role         string
		Status       string
	}

	err := h.DB.QueryRow(`
		SELECT id, board_id, invited_email, role, status
		FROM invitations 
		WHERE token = $1 AND expires_at > NOW()
	`, token).Scan(&invitation.ID, &invitation.BoardID, &invitation.InvitedEmail, &invitation.Role, &invitation.Status)

	if err != nil {
		http.Error(w, `{"error": "invalid or expired invitation"}`, http.StatusNotFound)
		return
	}

	if invitation.Status != "pending" {
		http.Error(w, `{"error": "invitation already used"}`, http.StatusBadRequest)
		return
	}

	// Получаем текущего пользователя
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, `{"error": "please login first"}`, http.StatusUnauthorized)
		return
	}

	// Проверяем email пользователя
	var userEmail string
	h.DB.QueryRow("SELECT email FROM users WHERE id = $1", userID).Scan(&userEmail)

	if userEmail != invitation.InvitedEmail {
		http.Error(w, `{"error": "this invitation is for another email"}`, http.StatusForbidden)
		return
	}

	// Добавляем пользователя в участники
	_, err = h.DB.Exec(`
		INSERT INTO board_members (board_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (board_id, user_id) DO NOTHING
	`, invitation.BoardID, userID, invitation.Role)

	if err != nil {
		http.Error(w, `{"error": "failed to add member"}`, http.StatusInternalServerError)
		return
	}

	// Обновляем статус приглашения
	_, err = h.DB.Exec(`
		UPDATE invitations SET status = 'accepted', updated_at = NOW()
		WHERE id = $1
	`, invitation.ID)

	if err != nil {
		http.Error(w, `{"error": "failed to update invitation"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Successfully joined the board!",
		"board_id": invitation.BoardID,
		"role":     invitation.Role,
	})
}
