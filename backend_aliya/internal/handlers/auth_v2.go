package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"kanban/internal/service"

	"github.com/golang-jwt/jwt/v5"
)

var jwtKey = []byte("secret_key")

type AuthHandlerV2 struct {
	service *service.AuthService
}

func NewAuthHandlerV2(s *service.AuthService) *AuthHandlerV2 {
	return &AuthHandlerV2{service: s}
}

func (h *AuthHandlerV2) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid request"}`, http.StatusBadRequest)
		return
	}

	err := h.service.Register(req.Name, req.Email, req.Password)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User created successfully"})
}

func (h *AuthHandlerV2) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "invalid request"}`, http.StatusBadRequest)
		return
	}

	id, name, email, err := h.service.Login(req.Email, req.Password)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusUnauthorized)
		return
	}

	claims := &jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		Subject:   string(rune(id)),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString(jwtKey)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": tokenStr,
		"user": map[string]interface{}{
			"id":    id,
			"name":  name,
			"email": email,
		},
	})
}
