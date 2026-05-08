package handlers

import (
	"encoding/json"
	"kanban/internal/models"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// Временное хранилище меток (пока нет БД)
var labels = []models.Label{}
var taskLabels = []models.TaskLabel{}
var nextLabelID = 1

// GET /labels
func GetLabels(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(labels)
}

// POST /labels
func CreateLabel(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	label := models.Label{
		ID:        nextLabelID,
		Name:      input.Name,
		Color:     input.Color,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	nextLabelID++
	labels = append(labels, label)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(label)
}

// DELETE /labels/:id
func DeleteLabel(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/labels/")
	id, _ := strconv.Atoi(idStr)

	for i, label := range labels {
		if label.ID == id {
			labels = append(labels[:i], labels[i+1:]...)
			w.WriteHeader(http.StatusNoContent)
			return
		}
	}
	http.Error(w, `{"error":"label not found"}`, http.StatusNotFound)
}

// POST /tasks/:id/labels - добавить метку к задаче
func AddLabelToTask(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, `{"error":"invalid url"}`, http.StatusBadRequest)
		return
	}
	taskID, _ := strconv.Atoi(parts[2])

	var input struct {
		LabelID int `json:"label_id"`
	}
	json.NewDecoder(r.Body).Decode(&input)

	taskLabel := models.TaskLabel{
		ID:      len(taskLabels) + 1,
		TaskID:  taskID,
		LabelID: input.LabelID,
	}
	taskLabels = append(taskLabels, taskLabel)

	json.NewEncoder(w).Encode(taskLabel)
}

// DELETE /tasks/:id/labels/:labelId - удалить метку у задачи
func RemoveLabelFromTask(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 6 {
		http.Error(w, `{"error":"invalid url"}`, http.StatusBadRequest)
		return
	}
	taskID, _ := strconv.Atoi(parts[2])
	labelID, _ := strconv.Atoi(parts[4])

	for i, tl := range taskLabels {
		if tl.TaskID == taskID && tl.LabelID == labelID {
			taskLabels = append(taskLabels[:i], taskLabels[i+1:]...)
			w.WriteHeader(http.StatusNoContent)
			return
		}
	}
	http.Error(w, `{"error":"task-label relation not found"}`, http.StatusNotFound)
}

// GET /tasks/:id/labels - получить метки задачи
func GetTaskLabels(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, `{"error":"invalid url"}`, http.StatusBadRequest)
		return
	}
	taskID, _ := strconv.Atoi(parts[2])

	var result []models.Label
	for _, tl := range taskLabels {
		if tl.TaskID == taskID {
			for _, label := range labels {
				if label.ID == tl.LabelID {
					result = append(result, label)
					break
				}
			}
		}
	}
	json.NewEncoder(w).Encode(result)
}
