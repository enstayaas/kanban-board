package middleware

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

// OwnerOnly - только владелец доски
func OwnerOnly(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		userID, ok := r.Context().Value(UserIDKey).(int)
		if !ok {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		vars := mux.Vars(r)

		// Получаем board id
		boardIDStr := vars["id"]

		// Если id нет в URL path — берём из query параметра
		if boardIDStr == "" {
			boardIDStr = r.URL.Query().Get("board_id")
		}

		boardID, err := strconv.Atoi(boardIDStr)
		if err != nil {
			http.Error(w, `{"error":"invalid board id"}`, http.StatusBadRequest)
			return
		}

		var ownerID int

		err = db.QueryRow(
			"SELECT owner_id FROM boards WHERE id = $1",
			boardID,
		).Scan(&ownerID)

		if err != nil {
			http.Error(w, `{"error":"board not found"}`, http.StatusNotFound)
			return
		}

		if ownerID != userID {
			http.Error(w, `{"error":"access denied - owner only"}`, http.StatusForbidden)
			return
		}

		next(w, r)
	}
}

// MemberOnly - участник доски или владелец
func MemberOnly(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		userID, ok := r.Context().Value(UserIDKey).(int)
		if !ok {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		vars := mux.Vars(r)

		// Получаем board id
		boardIDStr := vars["id"]

		// Если id нет в URL path — берём из query
		if boardIDStr == "" {
			boardIDStr = r.URL.Query().Get("board_id")
		}

		boardID, err := strconv.Atoi(boardIDStr)
		if err != nil {
			http.Error(w, `{"error":"invalid board id"}`, http.StatusBadRequest)
			return
		}

		// Проверяем участника
		var count int

		db.QueryRow(`
			SELECT COUNT(*)
			FROM board_members
			WHERE board_id = $1 AND user_id = $2
		`, boardID, userID).Scan(&count)

		// Проверяем владельца
		var ownerID int

		db.QueryRow(`
			SELECT owner_id
			FROM boards
			WHERE id = $1
		`, boardID).Scan(&ownerID)

		if count == 0 && ownerID != userID {
			http.Error(w, `{"error":"access denied - member only"}`, http.StatusForbidden)
			return
		}

		next(w, r)
	}
}

// TaskAccess - доступ к задаче через доску
func TaskAccess(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		userID, ok := r.Context().Value(UserIDKey).(int)
		if !ok {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		vars := mux.Vars(r)

		taskID, err := strconv.Atoi(vars["id"])
		if err != nil {
			http.Error(w, `{"error":"invalid task id"}`, http.StatusBadRequest)
			return
		}

		// Получаем board_id через задачу
		var boardID int

		err = db.QueryRow(`
			SELECT b.id
			FROM boards b
			JOIN columns c ON c.board_id = b.id
			JOIN tasks t ON t.column_id = c.id
			WHERE t.id = $1
		`, taskID).Scan(&boardID)

		if err != nil {
			http.Error(w, `{"error":"task not found"}`, http.StatusNotFound)
			return
		}

		// Проверяем участие
		var count int

		db.QueryRow(`
			SELECT COUNT(*)
			FROM board_members
			WHERE board_id = $1 AND user_id = $2
		`, boardID, userID).Scan(&count)

		// Проверяем владельца
		var ownerID int

		db.QueryRow(`
			SELECT owner_id
			FROM boards
			WHERE id = $1
		`, boardID).Scan(&ownerID)

		if count == 0 && ownerID != userID {
			http.Error(w, `{"error":"access denied"}`, http.StatusForbidden)
			return
		}

		next(w, r)
	}
}
