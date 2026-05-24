package unit

import (
	"kanban/internal/service"
	"testing"
)

func TestValidateEmail(t *testing.T) {
	s := &service.AuthService{}

	tests := []struct {
		name     string
		email    string
		expected bool
	}{
		{"Valid email", "test@example.com", true},
		{"Valid email with dots", "test.name@example.co.uk", true},
		{"Invalid - no @", "testexample.com", false},
		{"Invalid - no domain", "test@", false},
		{"Invalid - no local part", "@example.com", false},
		{"Empty email", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := s.ValidateEmail(tt.email)
			if result != tt.expected {
				t.Errorf("ValidateEmail(%s) = %v, expected %v", tt.email, result, tt.expected)
			}
		})
	}
}

func TestValidatePassword(t *testing.T) {
	s := &service.AuthService{}

	tests := []struct {
		name     string
		password string
		expected bool
	}{
		{"Valid password 6 chars", "123456", true},
		{"Valid password 10 chars", "password123", true},
		{"Invalid - 5 chars", "12345", false},
		{"Empty password", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := s.ValidatePassword(tt.password)
			if result != tt.expected {
				t.Errorf("ValidatePassword(%s) = %v, expected %v", tt.password, result, tt.expected)
			}
		})
	}
}
