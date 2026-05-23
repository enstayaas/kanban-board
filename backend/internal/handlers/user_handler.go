package handlers

import (
	"encoding/json"
	"fmt"
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
	{ID: 1, Name: "Анна Смирнова", Email: "anna@example.com"},
	{ID: 2, Name: "Борис Петров", Email: "boris@example.com"},
	{ID: 3, Name: "Виктор Сидоров", Email: "viktor@example.com"},
	{ID: 4, Name: "Дарья Кузнецова", Email: "daria@example.com"},
	{ID: 5, Name: "Елена Морозова", Email: "elena@example.com"},
	{ID: 6, Name: "Максим Иванов", Email: "maxim@example.com"},
	{ID: 7, Name: "Ольга Соколова", Email: "olga@example.com"},
	{ID: 8, Name: "Игорь Васильев", Email: "igor@example.com"},
}

// Временно
func init() {
	fmt.Println("ЗАГРУЗКА НОВОГО user_handler.go с 8 пользователями")
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

// PUT /users/:id
func UpdateUser(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/users/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid user id"}`, http.StatusBadRequest)
		return
	}

	var input struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}

	for i, user := range users {
		if user.ID == id {
			if input.Name != "" {
				users[i].Name = input.Name
			}
			if input.Email != "" {
				users[i].Email = input.Email
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(users[i])
			return
		}
	}
	http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
}

// package handlers

// import (
// 	"encoding/json"
// 	"net/http"
// 	"strconv"
// 	"strings"

// 	"kanban/internal/models"
// )

// type UserResponse struct {
// 	ID    int    `json:"id"`
// 	Name  string `json:"name"`
// 	Email string `json:"email"`
// }

// var users = []models.User{
// 	{
// 		ID:    1,
// 		Name:  "Анна Смирнова",
// 		Email: "anna@example.com",
// 	},
// 	{
// 		ID:    2,
// 		Name:  "Борис Петров",
// 		Email: "boris@example.com",
// 	},
// 	{
// 		ID:    3,
// 		Name:  "Виктор Сидоров",
// 		Email: "viktor@example.com",
// 	},
// 	{
// 		ID:    4,
// 		Name:  "Дарья Кузнецова",
// 		Email: "daria@example.com",
// 	},
// 	{
// 		ID:    5,
// 		Name:  "Елена Морозова",
// 		Email: "elena@example.com",
// 	},
// 	{
// 		ID:    6,
// 		Name:  "Максим Иванов",
// 		Email: "maxim@example.com",
// 	},
// 	{
// 		ID:    7,
// 		Name:  "Ольга Соколова",
// 		Email: "olga@example.com",
// 	},
// 	{
// 		ID:    8,
// 		Name:  "Игорь Васильев",
// 		Email: "igor@example.com",
// 	},
// }

// func GetUsers(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")

// 	var response []UserResponse

// 	for _, u := range users {
// 		response = append(response, UserResponse{
// 			ID:    u.ID,
// 			Name:  u.Name,
// 			Email: u.Email,
// 		})
// 	}

// 	json.NewEncoder(w).Encode(response)
// }

// func GetUserByID(w http.ResponseWriter, r *http.Request) {
// 	idStr := strings.TrimPrefix(r.URL.Path, "/users/")
// 	id, _ := strconv.Atoi(idStr)

// 	for _, user := range users {
// 		if user.ID == id {
// 			response := UserResponse{
// 				ID:    user.ID,
// 				Name:  user.Name,
// 				Email: user.Email,
// 			}

// 			w.Header().Set("Content-Type", "application/json")
// 			json.NewEncoder(w).Encode(response)
// 			return
// 		}
// 	}

// 	http.Error(w, "User not found", http.StatusNotFound)
// }

// package handlers

// import (
// 	"encoding/json"
// 	"net/http"
// 	"strconv"
// 	"strings"

// 	"kanban/internal/models"
// )

// type UserResponse struct {
// 	ID    int    `json:"id"`
// 	Name  string `json:"name"`
// 	Email string `json:"email"`
// }

// var users = []models.User{
// 	{
// 		ID:    1,
// 		Name:  "Akylai",
// 		Email: "akylai@mail.com",
// 	},
// 	{
// 		ID:    2,
// 		Name:  "Aigerim",
// 		Email: "aigerim@mail.com",
// 	},
// }

// func GetUsers(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")

// 	var response []UserResponse

// 	for _, u := range users {
// 		response = append(response, UserResponse{
// 			ID:    u.ID,
// 			Name:  u.Name,
// 			Email: u.Email,
// 		})
// 	}

// 	json.NewEncoder(w).Encode(response)
// }

// func GetUserByID(w http.ResponseWriter, r *http.Request) {
// 	idStr := strings.TrimPrefix(r.URL.Path, "/users/")
// 	id, _ := strconv.Atoi(idStr)

// 	for _, user := range users {
// 		if user.ID == id {
// 			response := UserResponse{
// 				ID:    user.ID,
// 				Name:  user.Name,
// 				Email: user.Email,
// 			}

// 			w.Header().Set("Content-Type", "application/json")
// 			json.NewEncoder(w).Encode(response)
// 			return
// 		}
// 	}

// 	http.Error(w, "User not found", http.StatusNotFound)
// }

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
