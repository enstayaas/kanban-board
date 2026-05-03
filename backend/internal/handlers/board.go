package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"kanban/internal/models"
)

var boards []models.Board

// Временный массив
func init() {
	boards = append(boards, models.Board{
		ID:          1,
		Title:       "Test Board",
		Description: "Demo project",
		OwnerID:     1,
	})
}

// GET /boards/:id
func GetBoard(w http.ResponseWriter, r *http.Request) {
	// получаем id из URL
	idStr := strings.TrimPrefix(r.URL.Path, "/boards/")
	id, _ := strconv.Atoi(idStr)

	for _, board := range boards {

		if board.ID == id {
			//Безопасность
			userIDStr := r.URL.Query().Get("user_id")
			userID, _ := strconv.Atoi(userIDStr)

			if !isBoardMember(userID, board.ID) {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}
			//до сюда
			json.NewEncoder(w).Encode(board)
			return
		}
	}

	http.Error(w, "Board not found", http.StatusNotFound)
}

// PUT /boards/:id
func UpdateBoard(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/boards/")
	id, _ := strconv.Atoi(idStr)

	var input models.Board
	json.NewDecoder(r.Body).Decode(&input)

	for i, board := range boards {
		if board.ID == id {
			userIDStr := r.URL.Query().Get("user_id")
			userID, _ := strconv.Atoi(userIDStr)

			if !isBoardMember(userID, board.ID) {
				http.Error(w, "Forbidden", http.StatusForbidden)
				return
			}
			boards[i].Title = input.Title
			boards[i].Description = input.Description

			json.NewEncoder(w).Encode(boards[i])
			return
		}
	}

	http.Error(w, "Board not found", http.StatusNotFound)
}

var boardMembers []models.BoardMember

// POST /boards/:id/members
func AddMember(w http.ResponseWriter, r *http.Request) {
	// получаем board_id из URL
	idStr := strings.TrimPrefix(r.URL.Path, "/boards/")
	parts := strings.Split(idStr, "/")

	if len(parts) < 2 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}

	boardID, _ := strconv.Atoi(parts[0])

	// читаем body
	var input struct {
		UserID int    `json:"user_id"`
		Role   string `json:"role"`
	}

	json.NewDecoder(r.Body).Decode(&input)

	member := models.BoardMember{
		ID:      len(boardMembers) + 1,
		BoardID: boardID,
		UserID:  input.UserID,
		Role:    input.Role,
	}

	boardMembers = append(boardMembers, member)

	json.NewEncoder(w).Encode(member)
}

func isBoardMember(userID int, boardID int) bool {
	for _, m := range boardMembers {
		if m.UserID == userID && m.BoardID == boardID {
			return true
		}
	}
	return false
}
