package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

type StatsHandler struct {
	DB *sql.DB
}

type StatsResponse struct {
	Total      int `json:"total"`
	Done       int `json:"done"`
	InProgress int `json:"inProgress"`
	Todo       int `json:"todo"`
}

func (h *StatsHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	var total, done, inProgress, todo int

	h.DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE archived_at IS NULL").Scan(&total)
	h.DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE column_id=3 AND archived_at IS NULL").Scan(&done)
	h.DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE column_id=2 AND archived_at IS NULL").Scan(&inProgress)
	h.DB.QueryRow("SELECT COUNT(*) FROM tasks WHERE column_id=1 AND archived_at IS NULL").Scan(&todo)

	json.NewEncoder(w).Encode(StatsResponse{
		Total:      total,
		Done:       done,
		InProgress: inProgress,
		Todo:       todo,
	})
}
