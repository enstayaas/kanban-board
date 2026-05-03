package handlers

import (
	"encoding/json"
	"fmt"
	"kanban/internal/models"
	"net/http"
	"strconv"
	"strings"
	"time"
)

var tasks []models.Task
var nextTaskID = 1

// POST /tasks
func CreateTask(w http.ResponseWriter, r *http.Request) {
	fmt.Println("CreateTask called")

	var input struct {
		BoardID     int    `json:"board_id"`
		ColumnID    int    `json:"column_id"`
		Title       string `json:"title"`
		Description string `json:"description"`
		Priority    string `json:"priority"`
		CreatedBy   int    `json:"created_by"`
		AssignedTo  int    `json:"assigned_to"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// 👉 простая валидация
	if input.BoardID == 0 || input.ColumnID == 0 || input.Title == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	task := models.Task{
		ID:          nextTaskID,
		BoardID:     input.BoardID,
		ColumnID:    input.ColumnID,
		Title:       input.Title,
		Description: input.Description,
		Priority:    input.Priority,
		CreatedBy:   input.CreatedBy,
		AssignedTo:  input.AssignedTo,
		Position:    len(tasks) + 1,
	}

	nextTaskID++
	tasks = append(tasks, task)

	json.NewEncoder(w).Encode(task)
}

// PATCH /tasks/:id
func UpdateTask(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/tasks/")
	id, _ := strconv.Atoi(idStr)

	var input struct {
		ColumnID    int    `json:"column_id"`
		Position    int    `json:"position"`
		Title       string `json:"title"`
		Description string `json:"description"`
	}

	json.NewDecoder(r.Body).Decode(&input)

	for i, task := range tasks {
		if task.ID == id {

			// меняем колонку
			if input.ColumnID != 0 {
				tasks[i].ColumnID = input.ColumnID
			}

			// меняем позицию
			if input.Position != 0 {
				tasks[i].Position = input.Position
			}

			// обновляем title
			if input.Title != "" {
				tasks[i].Title = input.Title
			}

			// обновляем description
			if input.Description != "" {
				tasks[i].Description = input.Description
			}

			json.NewEncoder(w).Encode(tasks[i])
			return
		}
	}

	http.Error(w, "Task not found", http.StatusNotFound)
}

// GET /tasks (только НЕ архивные)
// func GetTasks(w http.ResponseWriter, r *http.Request) {
// 	var activeTasks []models.Task

// 	for _, task := range tasks {
// 		if task.ArchivedAt == nil {
// 			activeTasks = append(activeTasks, task)
// 		}
// 	}

//		json.NewEncoder(w).Encode(activeTasks)
//	}
func GetTasks(w http.ResponseWriter, r *http.Request) {
	var activeTasks []models.Task

	for _, task := range tasks {
		if task.ArchivedAt == nil {
			activeTasks = append(activeTasks, task)
		}
	}

	// ❗ ВАЖНО: если пусто → вернуть []
	if activeTasks == nil {
		activeTasks = []models.Task{}
	}

	json.NewEncoder(w).Encode(activeTasks)
}

// GET /tasks/archive
func GetArchivedTasks(w http.ResponseWriter, r *http.Request) {
	var archived []models.Task

	for _, task := range tasks {
		if task.ArchivedAt != nil {
			archived = append(archived, task)
		}
	}

	json.NewEncoder(w).Encode(archived)
}

// PATCH /tasks/:id/archive
func ArchiveTask(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/tasks/")
	idStr = strings.TrimSuffix(idStr, "/archive")
	id, _ := strconv.Atoi(idStr)

	now := time.Now()

	for i, task := range tasks {
		if task.ID == id {
			tasks[i].ArchivedAt = &now

			json.NewEncoder(w).Encode(tasks[i])
			return
		}
	}

	http.Error(w, "Task not found", http.StatusNotFound)
}
