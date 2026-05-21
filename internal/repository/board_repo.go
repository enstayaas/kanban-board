package repository

import (
	"database/sql"
)

type BoardRepository struct {
	DB *sql.DB
}

func NewBoardRepository(db *sql.DB) *BoardRepository {
	return &BoardRepository{DB: db}
}

func (r *BoardRepository) GetBoardsByUserID(userID int) (*sql.Rows, error) {
	return r.DB.Query(`
		SELECT DISTINCT b.id, b.title, b.description
		FROM boards b
		LEFT JOIN board_members bm ON bm.board_id = b.id
		WHERE (b.owner_id=$1 OR bm.user_id=$1)
		AND b.deleted_at IS NULL
	`, userID)
}

func (r *BoardRepository) CreateBoard(title, description string, ownerID int) (int, error) {
	var boardID int
	err := r.DB.QueryRow(`
		INSERT INTO boards (title, description, owner_id)
		VALUES ($1, $2, $3)
		RETURNING id
	`, title, description, ownerID).Scan(&boardID)
	return boardID, err
}

func (r *BoardRepository) AddOwnerToMembers(boardID, userID int) error {
	_, err := r.DB.Exec(`
		INSERT INTO board_members (board_id, user_id, role)
		VALUES ($1, $2, 'owner')
	`, boardID, userID)
	return err
}

func (r *BoardRepository) DeleteBoard(boardID int) error {
	_, err := r.DB.Exec("UPDATE boards SET deleted_at = NOW() WHERE id=$1", boardID)
	return err
}

func (r *BoardRepository) GetBoardOwner(boardID int) (int, error) {
	var ownerID int
	err := r.DB.QueryRow("SELECT owner_id FROM boards WHERE id=$1", boardID).Scan(&ownerID)
	return ownerID, err
}

func (r *BoardRepository) BoardExists(boardID int) (bool, error) {
	var exists bool
	err := r.DB.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM boards WHERE id=$1 AND deleted_at IS NULL)
	`, boardID).Scan(&exists)
	return exists, err
}
