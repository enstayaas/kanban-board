package service

import (
	"database/sql"
	"encoding/json"
)

type ActivityService struct {
	DB *sql.DB
}

// Log - записывает действие в журнал активности
func (a *ActivityService) Log(boardID, userID int, userName, action, entityType string, entityID int, details interface{}) error {
	var detailsJSON []byte
	if details != nil {
		detailsJSON, _ = json.Marshal(details)
	}

	_, err := a.DB.Exec(`
		INSERT INTO activities (board_id, user_id, user_name, action, entity_type, entity_id, details)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, boardID, userID, userName, action, entityType, entityID, detailsJSON)

	return err
}

// GetBoardActivities - получить активность доски
func (a *ActivityService) GetBoardActivities(boardID int, limit, offset int) ([]map[string]interface{}, error) {
	rows, err := a.DB.Query(`
		SELECT id, user_id, user_name, action, entity_type, entity_id, details, created_at
		FROM activities
		WHERE board_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, boardID, limit, offset)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var activities []map[string]interface{}
	for rows.Next() {
		var id, userID, entityID int
		var userName, action, entityType string
		var detailsJSON []byte
		var createdAt string

		rows.Scan(&id, &userID, &userName, &action, &entityType, &entityID, &detailsJSON, &createdAt)

		var details map[string]interface{}
		json.Unmarshal(detailsJSON, &details)

		activities = append(activities, map[string]interface{}{
			"id":          id,
			"user_id":     userID,
			"user_name":   userName,
			"action":      action,
			"entity_type": entityType,
			"entity_id":   entityID,
			"details":     details,
			"created_at":  createdAt,
		})
	}

	return activities, nil
}
