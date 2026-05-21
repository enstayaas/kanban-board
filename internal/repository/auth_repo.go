package repository

import (
	"database/sql"
)

type AuthRepository struct {
	DB *sql.DB
}

func NewAuthRepository(db *sql.DB) *AuthRepository {
	return &AuthRepository{DB: db}
}

func (r *AuthRepository) CreateUser(name, email, passwordHash string) error {
	_, err := r.DB.Exec(
		"INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)",
		name, email, passwordHash,
	)
	return err
}

func (r *AuthRepository) GetUserByEmail(email string) (id int, name string, passwordHash string, err error) {
	err = r.DB.QueryRow(
		"SELECT id, name, password_hash FROM users WHERE email=$1",
		email,
	).Scan(&id, &name, &passwordHash)
	return
}
