package unit

import (
	"kanban/internal/service"
	"testing"
)

func TestValidateTitle(t *testing.T) {
	s := &service.BoardService{}

	tests := []struct {
		name     string
		title    string
		expected bool
	}{
		{"Valid title", "My Board", true},
		{"Empty title", "", false},
		{"Too long title", string(make([]byte, 300)), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := s.ValidateTitle(tt.title)
			if result != tt.expected {
				t.Errorf("ValidateTitle(%s) = %v, want %v", tt.title, result, tt.expected)
			}
		})
	}
}
