package utils

import (
	"regexp"
	"strings"
)

// ValidateEmail - проверяет корректность email
func ValidateEmail(email string) bool {
	if email == "" {
		return false
	}
	// Регулярное выражение для проверки email
	regex := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	match, _ := regexp.MatchString(regex, email)
	return match
}

// ValidatePassword - проверяет пароль (минимум 6 символов)
func ValidatePassword(password string) bool {
	if password == "" {
		return false
	}
	return len(password) >= 6
}

// ValidateTitle - проверяет заголовок (не пустой, не слишком длинный)
func ValidateTitle(title string) bool {
	if title == "" {
		return false
	}
	if len(title) > 255 {
		return false
	}
	return true
}

// ValidatePriority - проверяет приоритет (только high/medium/low)
func ValidatePriority(priority string) bool {
	priority = strings.ToLower(priority)
	return priority == "high" || priority == "medium" || priority == "low"
}

// ValidateRequired - проверяет что поле не пустое
func ValidateRequired(value string) bool {
	return strings.TrimSpace(value) != ""
}

// ValidateDescription - проверяет описание (не слишком длинное)
func ValidateDescription(description string) bool {
	return len(description) <= 1000
}
