package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"kanban/internal/models"
)

var comments []models.Comment

// POST /comments
func CreateComment(w http.ResponseWriter, r *http.Request) {
	fmt.Println("CreateComment called")
	var input struct {
		TaskID  int    `json:"task_id"`
		UserID  int    `json:"user_id"`
		Content string `json:"content"`
	}

	json.NewDecoder(r.Body).Decode(&input)

	comment := models.Comment{
		ID:        len(comments) + 1,
		TaskID:    input.TaskID,
		UserID:    input.UserID,
		Content:   input.Content,
		CreatedAt: time.Now(),
	}

	comments = append(comments, comment)

	json.NewEncoder(w).Encode(comment)
}
