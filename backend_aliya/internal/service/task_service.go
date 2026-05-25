package service

import (
	"database/sql"
	"errors"
)

type TaskService struct {
	DB *sql.DB
}

func NewTaskService(db *sql.DB) *TaskService {
	return &TaskService{DB: db}
}

// CheckUserIsBoardMember - проверяет что пользователь участник доски
func (s *TaskService) CheckUserIsBoardMember(boardID, userID int) (bool, error) {
	var count int
	err := s.DB.QueryRow(`
		SELECT COUNT(*) FROM board_members 
		WHERE board_id = $1 AND user_id = $2
	`, boardID, userID).Scan(&count)
	if err != nil {
		return false, err
	}

	var ownerID int
	s.DB.QueryRow("SELECT owner_id FROM boards WHERE id = $1", boardID).Scan(&ownerID)

	return count > 0 || ownerID == userID, nil
}

// CheckAssignedToIsMember - проверяет что исполнитель задачи является участником доски
func (s *TaskService) CheckAssignedToIsMember(taskID, assignedTo int) error {
	// Получаем board_id задачи
	var boardID int
	err := s.DB.QueryRow(`
		SELECT b.id FROM boards b
		JOIN columns c ON c.board_id = b.id
		JOIN tasks t ON t.column_id = c.id
		WHERE t.id = $1
	`, taskID).Scan(&boardID)
	if err != nil {
		return errors.New("task not found")
	}

	// Проверяем что исполнитель участник доски
	isMember, err := s.CheckUserIsBoardMember(boardID, assignedTo)
	if err != nil {
		return err
	}
	if !isMember {
		return errors.New("assigned_to user is not a member of this board")
	}

	return nil
}

// UpdateTaskWithAssignedToCheck - обновление задачи с проверкой исполнителя
func (s *TaskService) UpdateTaskWithAssignedToCheck(taskID int, title, description, priority string, columnID, position, assignedTo int) error {
	// Если указан исполнитель - проверяем что он участник доски
	if assignedTo > 0 {
		err := s.CheckAssignedToIsMember(taskID, assignedTo)
		if err != nil {
			return err
		}
	}

	// Обновляем задачу
	_, err := s.DB.Exec(`
		UPDATE tasks 
		SET title = COALESCE($1, title),
			description = COALESCE($2, description),
			priority = COALESCE($3, priority),
			column_id = COALESCE($4, column_id),
			position = COALESCE($5, position),
			assigned_to = COALESCE($6, assigned_to),
			updated_at = NOW()
		WHERE id = $7
	`, title, description, priority, columnID, position, assignedTo, taskID)

	return err
}
