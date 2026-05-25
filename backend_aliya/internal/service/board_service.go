package service

import (
	"database/sql"
	"errors"
	"kanban/internal/repository"
)

type BoardService struct {
	repo *repository.BoardRepository
}

func NewBoardService(repo *repository.BoardRepository) *BoardService {
	return &BoardService{repo: repo}
}

// ValidateTitle - проверяет название доски
func (s *BoardService) ValidateTitle(title string) bool {
	if title == "" {
		return false
	}
	return len(title) <= 255
}

func (s *BoardService) GetBoards(userID int) (*sql.Rows, error) {
	return s.repo.GetBoardsByUserID(userID)
}

func (s *BoardService) CreateBoard(title, description string, userID int) (int, error) {
	if !s.ValidateTitle(title) {
		return 0, errors.New("invalid title")
	}

	boardID, err := s.repo.CreateBoard(title, description, userID)
	if err != nil {
		return 0, err
	}

	err = s.repo.AddOwnerToMembers(boardID, userID)
	return boardID, err
}

func (s *BoardService) DeleteBoard(boardID, userID int) error {
	exists, err := s.repo.BoardExists(boardID)
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("board not found")
	}

	ownerID, err := s.repo.GetBoardOwner(boardID)
	if err != nil {
		return err
	}

	if ownerID != userID {
		return errors.New("only owner can delete")
	}

	return s.repo.DeleteBoard(boardID)
}
