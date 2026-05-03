package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"kanban/internal/models"
)

var columns []models.Column

// PUT /columns/:id
func UpdateColumn(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/columns/")
	id, _ := strconv.Atoi(idStr)

	var input struct {
		Title    string `json:"title"`
		Position int    `json:"position"`
	}

	json.NewDecoder(r.Body).Decode(&input)

	for i, col := range columns {
		if col.ID == id {
			columns[i].Title = input.Title
			columns[i].Position = input.Position

			json.NewEncoder(w).Encode(columns[i])
			return
		}
	}

	http.Error(w, "Column not found", http.StatusNotFound)
}

// PATCH /columns/:id/restore
func RestoreColumn(w http.ResponseWriter, r *http.Request) {
	// убираем /restore
	path := strings.TrimSuffix(r.URL.Path, "/restore")
	idStr := strings.TrimPrefix(path, "/columns/")
	id, _ := strconv.Atoi(idStr)

	for i, col := range columns {
		if col.ID == id {
			columns[i].DeletedAt = nil
			columns[i].Position = col.LastPosition

			json.NewEncoder(w).Encode(columns[i])
			return
		}
	}

	http.Error(w, "Column not found", http.StatusNotFound)
}

// Потом добавила Time
func init() {
	now := time.Now()

	columns = append(columns, models.Column{
		ID:           1,
		BoardID:      1,
		Title:        "To Do",
		Position:     1,
		LastPosition: 1,
	})

	columns = append(columns, models.Column{
		ID:           2,
		BoardID:      1,
		Title:        "In Progress",
		Position:     2,
		LastPosition: 2,
		DeletedAt:    &now, // типа удалена
	})

	//сюда тоже добавила Безопасность
	boardMembers = append(boardMembers, models.BoardMember{
		ID:      1,
		BoardID: 1,
		UserID:  1,
		Role:    "owner",
	})
}
