package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

type Label struct {
	ID        int        `json:"id"`
	BoardID   int        `json:"board_id"`
	Name      string     `json:"name"`
	Color     string     `json:"color"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at"`
}

type LabelHandler struct {
	DB *sql.DB
}

// GET /labels?board_id=1 - получить все метки доски
func (h *LabelHandler) GetLabels(w http.ResponseWriter, r *http.Request) {
	boardIDStr := r.URL.Query().Get("board_id")
	boardID, err := strconv.Atoi(boardIDStr)
	if err != nil {
		http.Error(w, `{"error": "board_id is required"}`, http.StatusBadRequest)
		return
	}

	rows, err := h.DB.Query(`
		SELECT id, board_id, name, color, created_at, updated_at
		FROM labels
		WHERE board_id = $1 AND deleted_at IS NULL
		ORDER BY name
	`, boardID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var labels []Label
	for rows.Next() {
		var l Label
		err := rows.Scan(&l.ID, &l.BoardID, &l.Name, &l.Color, &l.CreatedAt, &l.UpdatedAt)
		if err != nil {
			continue
		}
		labels = append(labels, l)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(labels)
}

// POST /labels - создать метку
func (h *LabelHandler) CreateLabel(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BoardID int    `json:"board_id"`
		Name    string `json:"name"`
		Color   string `json:"color"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid request"}`, http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, `{"error": "name is required"}`, http.StatusBadRequest)
		return
	}

	if req.Color == "" {
		req.Color = "#3B82F6" // синий по умолчанию
	}

	var labelID int
	err := h.DB.QueryRow(`
		INSERT INTO labels (board_id, name, color)
		VALUES ($1, $2, $3)
		RETURNING id
	`, req.BoardID, req.Name, req.Color).Scan(&labelID)

	if err != nil {
		http.Error(w, `{"error": "failed to create label"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int{"id": labelID})
}

// PUT /labels/{id} - обновить метку
func (h *LabelHandler) UpdateLabel(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	labelID := vars["id"]

	var req struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid request"}`, http.StatusBadRequest)
		return
	}

	_, err := h.DB.Exec(`
		UPDATE labels 
		SET name = COALESCE($1, name),
			color = COALESCE($2, color),
			updated_at = NOW()
		WHERE id = $3 AND deleted_at IS NULL
	`, req.Name, req.Color, labelID)

	if err != nil {
		http.Error(w, `{"error": "failed to update label"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "label updated"})
}

// DELETE /labels/{id} - мягкое удаление метки
func (h *LabelHandler) DeleteLabel(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	labelID := vars["id"]

	_, err := h.DB.Exec(`
		UPDATE labels SET deleted_at = NOW() WHERE id = $1
	`, labelID)

	if err != nil {
		http.Error(w, `{"error": "failed to delete label"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "label deleted"})
}
