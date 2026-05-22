package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestHealthCheck(t *testing.T) {
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	testRouter.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Health check failed: expected 200, got %d", w.Code)
	}

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp["status"] != "ok" {
		t.Errorf("Expected status 'ok', got '%s'", resp["status"])
	}
}

func TestRegister(t *testing.T) {
	// Уникальный email для каждого запуска теста
	email := fmt.Sprintf("test%d@integration.com", time.Now().UnixNano())

	body := map[string]interface{}{
		"name":     "TestUser",
		"email":    email,
		"password": "123456",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	testRouter.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Register failed: expected 201, got %d", w.Code)
	}
}

func TestRegisterInvalidEmail(t *testing.T) {
	body := map[string]interface{}{
		"name":     "TestUser",
		"email":    "invalid-email",
		"password": "123456",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	testRouter.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for invalid email, got %d", w.Code)
	}
}

func TestRegisterShortPassword(t *testing.T) {
	body := map[string]interface{}{
		"name":     "TestUser",
		"email":    "test@short.com",
		"password": "123",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/register", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	testRouter.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for short password, got %d", w.Code)
	}
}
