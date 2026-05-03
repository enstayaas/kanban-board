package handlers

import (
	"encoding/json"
	"net/http"

	"kanban/internal/models"

	"golang.org/x/crypto/bcrypt"
)

// type User struct {
// 	ID       int
// 	Email    string
// 	Password string
// 	Name     string
// }

var authUsers []models.User
var currentID = 1

func Register(w http.ResponseWriter, r *http.Request) {
	var input models.User

	json.NewDecoder(r.Body).Decode(&input)

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)

	user := models.User{
		ID:       currentID,
		Name:     input.Name,
		Email:    input.Email,
		Password: string(hashedPassword),
	}

	currentID++
	authUsers = append(authUsers, user)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func Me(w http.ResponseWriter, r *http.Request) {
	if len(authUsers) == 0 {
		http.Error(w, "No users", http.StatusUnauthorized)
		return
	}

	json.NewEncoder(w).Encode(authUsers[0])
}

// POST /register
// func Register(w http.ResponseWriter, r *http.Request) {
// 	var input User

// 	json.NewDecoder(r.Body).Decode(&input)

// 	// хешируем пароль
// 	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)

// 	user := User{
// 		ID:       currentID,
// 		Email:    input.Email,
// 		Password: string(hashedPassword),
// 	}

// 	currentID++
// 	// users = append(users, authUsers)
// 	authUsers = append(authUsers, user)

// 	w.WriteHeader(http.StatusCreated)
// 	json.NewEncoder(w).Encode(user)
// }

// GET /me
// func Me(w http.ResponseWriter, r *http.Request) {
// 	if len(authUsers) == 0 {
// 		http.Error(w, "No users", http.StatusUnauthorized)
// 		return
// 	}

// 	json.NewEncoder(w).Encode(authUsers[0])
// }
