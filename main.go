package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"kanban/handlers"
	"kanban/middleware"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"github.com/rs/cors"
)

func main() {
	connStr := "host=localhost port=5432 user=postgres password=aliya020507 dbname=Kanban-Board sslmode=disable"

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatal("DB error:", err)
	}
	defer db.Close()

	auth := &handlers.AuthHandler{DB: db}
	board := &handlers.BoardHandler{DB: db}
	column := &handlers.ColumnHandler{DB: db}
	task := &handlers.TaskHandler{DB: db}

	r := mux.NewRouter()

	// ========== ПУБЛИЧНЫЕ МАРШРУТЫ (без JWT) ==========
	r.HandleFunc("/register", auth.Register).Methods("POST")
	r.HandleFunc("/login", auth.Login).Methods("POST")

	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	}).Methods("GET")

	// ========== BOARDS ==========
	// GET /boards - список досок пользователя
	r.Handle("/boards", middleware.JWT(http.HandlerFunc(board.GetBoards))).Methods("GET")
	// POST /boards - создать доску
	r.Handle("/boards", middleware.JWT(http.HandlerFunc(board.CreateBoard))).Methods("POST")
	// DELETE /boards/{id} - удалить доску (только ВЛАДЕЛЕЦ)
	r.Handle("/boards/{id}", middleware.JWT(middleware.OwnerOnly(db, board.DeleteBoard))).Methods("DELETE")
	// GET /boards/{id}/members - список участников (только ВЛАДЕЛЕЦ)
	r.Handle("/boards/{id}/members", middleware.JWT(middleware.OwnerOnly(db, board.GetMembers))).Methods("GET")
	// POST /boards/{id}/members - добавить участника (только ВЛАДЕЛЕЦ)
	r.Handle("/boards/{id}/members", middleware.JWT(middleware.OwnerOnly(db, board.AddMemberToBoard))).Methods("POST")

	// ========== COLUMNS (только ВЛАДЕЛЕЦ) ==========
	r.Handle("/columns", middleware.JWT(middleware.OwnerOnly(db, column.GetColumns))).Methods("GET")
	r.Handle("/columns", middleware.JWT(middleware.OwnerOnly(db, column.CreateColumn))).Methods("POST")
	r.Handle("/columns/{id}", middleware.JWT(middleware.OwnerOnly(db, column.DeleteColumn))).Methods("DELETE")
	r.Handle("/columns/{id}/restore", middleware.JWT(middleware.OwnerOnly(db, column.RestoreColumn))).Methods("PATCH")

	// ========== TASKS (доступ для УЧАСТНИКОВ) ==========
	r.Handle("/tasks", middleware.JWT(middleware.MemberOnly(db, task.GetTasks))).Methods("GET")
	r.Handle("/tasks", middleware.JWT(middleware.MemberOnly(db, task.CreateTask))).Methods("POST")
	r.Handle("/tasks/{id}", middleware.JWT(middleware.MemberOnly(db, task.DeleteTask))).Methods("DELETE")
	r.Handle("/tasks/{id}", middleware.JWT(middleware.MemberOnly(db, task.UpdateTask))).Methods("PUT")
	r.Handle("/tasks/{id}/archive", middleware.JWT(middleware.MemberOnly(db, task.ArchiveTask))).Methods("PATCH")
	r.Handle("/tasks/{id}/restore", middleware.JWT(middleware.MemberOnly(db, task.RestoreTask))).Methods("PATCH")

	// ========== COMMENTS ==========
	r.Handle("/comments", middleware.JWT(http.HandlerFunc(task.CreateComment))).Methods("POST")
	r.Handle("/comments", middleware.JWT(http.HandlerFunc(task.GetComments))).Methods("GET")
	r.Handle("/comments/{id}", middleware.JWT(http.HandlerFunc(task.DeleteComment))).Methods("DELETE")

	// ========== LABELS ==========

	// ========== CORS ==========
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
