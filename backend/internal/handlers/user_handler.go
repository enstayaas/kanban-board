package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"kanban/internal/models"
)

type UserResponse struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

var users = []models.User{
	{
		ID:    1,
		Name:  "Akylai",
		Email: "akylai@mail.com",
	},
	{
		ID:    2,
		Name:  "Aigerim",
		Email: "aigerim@mail.com",
	},
}

func GetUsers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var response []UserResponse

	for _, u := range users {
		response = append(response, UserResponse{
			ID:    u.ID,
			Name:  u.Name,
			Email: u.Email,
		})
	}

	json.NewEncoder(w).Encode(response)
}

func GetUserByID(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/users/")
	id, _ := strconv.Atoi(idStr)

	for _, user := range users {
		if user.ID == id {
			response := UserResponse{
				ID:    user.ID,
				Name:  user.Name,
				Email: user.Email,
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
			return
		}
	}

	http.Error(w, "User not found", http.StatusNotFound)
}

// package handlers

// import (
// 	"encoding/json"
// 	"net/http"
// 	"strconv"
// 	"strings"

// 	"kanban/internal/models"
// )

// var users = []models.User{
// 	{
// 		ID: 1,
// 		Name: "Akylai",
// 		Email: "akylai@mail.com",
// 	},
// 	{
// 		ID: 2,
// 		Name: "Aigerim",
// 		Email: "aigerim@mail.com",
// 	},
// }

// func GetUsers(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(users)
// }

// func GetUserByID(w http.ResponseWriter, r *http.Request) {
// 	idStr := strings.TrimPrefix(r.URL.Path, "/users/")
// 	id, _ := strconv.Atoi(idStr)

// 	for _, user := range users {
// 		if user.ID == id {
// 			w.Header().Set("Content-Type", "application/json")
// 			json.NewEncoder(w).Encode(user)
// 			return
// 		}
// 	}

// 	http.Error(w, "User not found", http.StatusNotFound)
// }
