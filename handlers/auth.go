package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"regexp"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtKey = []byte("secret_key")

type AuthHandler struct {
	DB *sql.DB
}

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UserResponse struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type Claims struct {
	UserID int `json:"user_id"`
	jwt.RegisteredClaims
}

// ValidateEmail - проверяет корректность email
func ValidateEmail(email string) bool {
	if email == "" {
		return false
	}
	regex := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	match, _ := regexp.MatchString(regex, email)
	return match
}

// ValidatePassword - проверяет пароль (минимум 6 символов)
func ValidatePassword(password string) bool {
	return len(password) >= 6
}

// REGISTER
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid request"}`, http.StatusBadRequest)
		return
	}

	// ========== ПРОВЕРКИ ==========
	if req.Name == "" {
		http.Error(w, `{"error": "name is required"}`, http.StatusBadRequest)
		return
	}

	// Валидация email
	if !ValidateEmail(req.Email) {
		http.Error(w, `{"error": "invalid email format"}`, http.StatusBadRequest)
		return
	}

	// Валидация пароля
	if !ValidatePassword(req.Password) {
		http.Error(w, `{"error": "password must be at least 6 characters"}`, http.StatusBadRequest)
		return
	}
	// ================================

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, `{"error": "error hashing password"}`, http.StatusInternalServerError)
		return
	}

	_, err = h.DB.Exec(
		"INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)",
		req.Name, req.Email, string(hash),
	)

	if err != nil {
		http.Error(w, `{"error": "user already exists or database error"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User created successfully"})
}

// LOGIN
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid request"}`, http.StatusBadRequest)
		return
	}

	var user UserResponse
	var hash string

	err := h.DB.QueryRow(
		"SELECT id, name, password_hash FROM users WHERE email=$1",
		req.Email,
	).Scan(&user.ID, &user.Name, &hash)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, `{"error": "user not found"}`, http.StatusUnauthorized)
		} else {
			http.Error(w, `{"error": "database error"}`, http.StatusInternalServerError)
		}
		return
	}

	user.Email = req.Email

	err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password))
	if err != nil {
		http.Error(w, `{"error": "wrong password"}`, http.StatusUnauthorized)
		return
	}

	claims := &Claims{
		UserID: user.ID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString(jwtKey)
	if err != nil {
		http.Error(w, `{"error": "token generation error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	response := LoginResponse{
		Token: tokenStr,
		User:  user,
	}

	json.NewEncoder(w).Encode(response)
}
