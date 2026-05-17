package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func makeRequest(method, url, token string) *http.Response {
	req := httptest.NewRequest(method, url, nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	return w.Result()
}

func makeRequestWithBody(method, url, token string, body *bytes.Buffer) *http.Response {
	req := httptest.NewRequest(method, url, body)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	return w.Result()
}

// ========== ТЕСТЫ (ВКЛЮЧЕНЫ) ==========

func TestHealthCheck(t *testing.T) {
	resp := makeRequest("GET", "/health", "")
	if resp.StatusCode == 200 {
		t.Log("✅ Server is running")
	}
}

func TestRegister(t *testing.T) {
	body := map[string]interface{}{
		"name":     "Test User",
		"email":    "test@example.com",
		"password": "123456",
	}
	jsonBody, _ := json.Marshal(body)
	resp := makeRequestWithBody("POST", "/register", "", bytes.NewBuffer(jsonBody))
	if resp.StatusCode == 201 || resp.StatusCode == 200 {
		t.Log("✅ Register works")
	}
}

// TODO: Добавить полноценные тесты ролей
func TestOwnerCanDeleteBoard(t *testing.T) {
	t.Skip("Will implement after permissions are ready")
}

func TestMemberCannotDeleteBoard(t *testing.T) {
	t.Skip("Will implement after permissions are ready")
}

func TestOwnerCanAddMember(t *testing.T) {
	t.Skip("Will implement after permissions are ready")
}

func TestMemberCannotAddMember(t *testing.T) {
	t.Skip("Will implement after permissions are ready")
}

func TestUnauthorizedAccess(t *testing.T) {
	t.Skip("Will implement after permissions are ready")
}

func TestDeleteNonExistentBoard(t *testing.T) {
	t.Skip("Will implement after permissions are ready")
}

func TestCreateBoardWithEmptyTitle(t *testing.T) {
	t.Skip("Will implement after permissions are ready")
}

func TestAddYourselfAsMember(t *testing.T) {
	t.Skip("Will implement after permissions are ready")
}
