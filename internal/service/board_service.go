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

func (s *BoardService) GetBoards(userID int) (*sql.Rows, error) {
	return s.repo.GetBoardsByUserID(userID)
}

func (s *BoardService) CreateBoard(title, description string, userID int) (int, error) {
	if title == "" {
		return 0, errors.New("title is required")
	}
	if len(title) > 255 {
		return 0, errors.New("title too long")
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
