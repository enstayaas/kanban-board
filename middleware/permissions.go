package middleware

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

// OwnerOnly - проверяет что пользователь ВЛАДЕЛЕЦ доски
func OwnerOnly(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Получаем user_id из контекста (добавлен JWT)
		userID, ok := r.Context().Value(UserIDKey).(int)
		if !ok {
			http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
			return
		}

		// Получаем board_id из URL
		vars := mux.Vars(r)
		boardIDStr := vars["id"]
		boardID, err := strconv.Atoi(boardIDStr)
		if err != nil {
			http.Error(w, `{"error": "invalid board id"}`, http.StatusBadRequest)
			return
		}

		// Проверяем: является ли пользователь владельцем
		var ownerID int
		err = db.QueryRow("SELECT owner_id FROM boards WHERE id = $1", boardID).Scan(&ownerID)
		if err != nil {
			http.Error(w, `{"error": "board not found"}`, http.StatusNotFound)
			return
		}

		if ownerID != userID {
			http.Error(w, `{"error": "access denied - owner only"}`, http.StatusForbidden)
			return
		}

		next(w, r)
	}
}

// MemberOnly - проверяет что пользователь УЧАСТНИК доски (или владелец)
func MemberOnly(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value(UserIDKey).(int)
		if !ok {
			http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
			return
		}

		// Получаем board_id из URL
		vars := mux.Vars(r)
		boardIDStr := vars["id"]
		boardID, err := strconv.Atoi(boardIDStr)
		if err != nil {
			http.Error(w, `{"error": "invalid board id"}`, http.StatusBadRequest)
			return
		}

		// Проверяем: является ли пользователь участником
		var count int
		err = db.QueryRow(`
			SELECT COUNT(*) FROM board_members 
			WHERE board_id = $1 AND user_id = $2
		`, boardID, userID).Scan(&count)
		if err != nil {
			http.Error(w, `{"error": "database error"}`, http.StatusInternalServerError)
			return
		}

		// Также проверяем: может быть владельцем
		var ownerID int
		db.QueryRow("SELECT owner_id FROM boards WHERE id = $1", boardID).Scan(&ownerID)

		if count == 0 && ownerID != userID {
			http.Error(w, `{"error": "access denied - member only"}`, http.StatusForbidden)
			return
		}

		next(w, r)
	}
}
