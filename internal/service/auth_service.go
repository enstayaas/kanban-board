package service

import (
	"errors"
	"kanban/internal/repository"
	"regexp"

	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	repo *repository.AuthRepository
}

func NewAuthService(repo *repository.AuthRepository) *AuthService {
	return &AuthService{repo: repo}
}

func (s *AuthService) Register(name, email, password string) error {
	if name == "" {
		return errors.New("name is required")
	}
	regex := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	match, _ := regexp.MatchString(regex, email)
	if !match {
		return errors.New("invalid email format")
	}
	if len(password) < 6 {
		return errors.New("password must be at least 6 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.repo.CreateUser(name, email, string(hash))
}

func (s *AuthService) Login(email, password string) (int, string, string, error) {
	id, name, hash, err := s.repo.GetUserByEmail(email)
	if err != nil {
		return 0, "", "", errors.New("user not found")
	}

	err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		return 0, "", "", errors.New("wrong password")
	}

	return id, name, email, nil
}

// ValidateEmail - проверяет корректность email
func (s *AuthService) ValidateEmail(email string) bool {
	if email == "" {
		return false
	}
	regex := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	match, _ := regexp.MatchString(regex, email)
	return match
}

// ValidatePassword - проверяет пароль
func (s *AuthService) ValidatePassword(password string) bool {
	return len(password) >= 6
}
