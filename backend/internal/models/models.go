package models

import "time"

type User struct {
	ID        int
	Name      string
	Email     string
	Password  string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Board struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	OwnerID     int       `json:"owner_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Column struct {
	ID           int
	BoardID      int
	Title        string
	Position     int
	DeletedAt    *time.Time
	LastPosition int
}

type Task struct {
	ID          int        `json:"id"`
	BoardID     int        `json:"board_id"`
	ColumnID    int        `json:"column_id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Priority    string     `json:"priority"`
	CreatedBy   int        `json:"created_by"`
	AssignedTo  int        `json:"assigned_to"`
	Position    int        `json:"position"`
	DoneAt      *time.Time `json:"done_at"`
	ArchivedAt  *time.Time `json:"archived_at"`
	DeletedAt   *time.Time `json:"deleted_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// type Task struct {
// 	ID          int
// 	BoardID     int
// 	ColumnID    int
// 	Title       string
// 	Description string
// 	Priority    string
// 	CreatedBy   int
// 	AssignedTo  int
// 	Position    int
// 	DoneAt      *time.Time
// 	ArchivedAt  *time.Time
// 	DeletedAt   *time.Time
// 	CreatedAt   time.Time
// 	UpdatedAt   time.Time
// }

type Comment struct {
	ID        int
	TaskID    int
	UserID    int
	Content   string
	CreatedAt time.Time
	DeletedAt *time.Time
}

type BoardMember struct {
	ID      int    `json:"id"`
	BoardID int    `json:"board_id"`
	UserID  int    `json:"user_id"`
	Role    string `json:"role"`
}

type UserResponse struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}
