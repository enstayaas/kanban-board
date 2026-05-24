package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"kanban/handlers"
	"kanban/internal/repository"
	"kanban/internal/service"
	"kanban/internal/utils"
	"kanban/middleware"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"github.com/rs/cors"
)

func main() {
	utils.LogInfo("Starting server...")

	connStr := "host=localhost port=5432 user=postgres password=aliya020507 dbname=Kanban-Board sslmode=disable"

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		utils.LogError(err, "Failed to connect to database")
		log.Fatal(err)
	}

	err = db.Ping()
	if err != nil {
		utils.LogError(err, "Database ping failed")
		log.Fatal("DB error:", err)
	}
	defer db.Close()

	utils.LogInfo("Database connected successfully")

	// Репозитории
	authRepo := repository.NewAuthRepository(db)
	boardRepo := repository.NewBoardRepository(db)

	// Сервисы
	_ = service.NewAuthService(authRepo)
	_ = service.NewBoardService(boardRepo)

	// Хендлеры
	authHandler := &handlers.AuthHandler{DB: db}
	boardHandler := &handlers.BoardHandler{DB: db}
	columnHandler := &handlers.ColumnHandler{DB: db}
	taskHandler := &handlers.TaskHandler{DB: db}
	labelHandler := &handlers.LabelHandler{DB: db}

	r := mux.NewRouter()

	// Глобальное логирование запросов
	r.Use(middleware.LoggingMiddleware)

	// ========== ПУБЛИЧНЫЕ МАРШРУТЫ ==========
	r.HandleFunc("/register", authHandler.Register).Methods("POST")
	r.HandleFunc("/login", authHandler.Login).Methods("POST")
	r.HandleFunc("/health", healthHandler).Methods("GET")

	// ========== BOARDS ==========
	r.Handle("/boards", middleware.JWT(http.HandlerFunc(boardHandler.GetBoards))).Methods("GET")
	r.Handle("/boards", middleware.JWT(http.HandlerFunc(boardHandler.CreateBoard))).Methods("POST")
	r.Handle("/boards/{id}", middleware.JWT(middleware.OwnerOnly(db, boardHandler.DeleteBoard))).Methods("DELETE")
	r.Handle("/boards/{id}/members", middleware.JWT(middleware.OwnerOnly(db, boardHandler.GetMembers))).Methods("GET")
	r.Handle("/boards/{id}/members", middleware.JWT(middleware.OwnerOnly(db, boardHandler.AddMemberToBoard))).Methods("POST")

	// ========== COLUMNS ==========
	r.Handle("/columns", middleware.JWT(middleware.OwnerOnly(db, columnHandler.GetColumns))).Methods("GET")
	r.Handle("/columns", middleware.JWT(http.HandlerFunc(columnHandler.CreateColumn))).Methods("POST")
	r.Handle("/columns/{id}", middleware.JWT(middleware.OwnerOnly(db, columnHandler.DeleteColumn))).Methods("DELETE")
	r.Handle("/columns/{id}/restore", middleware.JWT(middleware.OwnerOnly(db, columnHandler.RestoreColumn))).Methods("PATCH")

	// ========== TASKS ==========
	r.Handle("/tasks", middleware.JWT(http.HandlerFunc(taskHandler.GetTasks))).Methods("GET")
	r.Handle("/tasks", middleware.JWT(http.HandlerFunc(taskHandler.CreateTask))).Methods("POST")
	r.Handle("/tasks/{id}", middleware.JWT(http.HandlerFunc(taskHandler.DeleteTask))).Methods("DELETE")
	r.Handle("/tasks/{id}", middleware.JWT(http.HandlerFunc(taskHandler.UpdateTask))).Methods("PUT")
	r.Handle("/tasks/{id}/archive", middleware.JWT(http.HandlerFunc(taskHandler.ArchiveTask))).Methods("PATCH")
	r.Handle("/tasks/{id}/restore", middleware.JWT(http.HandlerFunc(taskHandler.RestoreTask))).Methods("PATCH")

	// ========== TASK LABELS ==========
	r.Handle("/tasks/{id}/labels", middleware.JWT(http.HandlerFunc(taskHandler.AddLabelToTask))).Methods("POST")
	r.Handle("/tasks/{id}/labels/{labelId}", middleware.JWT(http.HandlerFunc(taskHandler.RemoveLabelFromTask))).Methods("DELETE")
	r.Handle("/tasks/{id}/labels", middleware.JWT(http.HandlerFunc(taskHandler.GetTaskLabels))).Methods("GET")

	// ========== TASKS ARCHIVE ==========
	r.Handle("/tasks/archive", middleware.JWT(http.HandlerFunc(taskHandler.GetArchivedTasks))).Methods("GET")
	r.Handle("/tasks/{id}/permanent", middleware.JWT(http.HandlerFunc(taskHandler.PermanentDeleteTask))).Methods("DELETE")
	r.Handle("/tasks/archive/clean", middleware.JWT(http.HandlerFunc(taskHandler.CleanTrash))).Methods("DELETE")
	// ========== LABELS ==========
	r.Handle("/labels", middleware.JWT(http.HandlerFunc(labelHandler.GetLabels))).Methods("GET")
	r.Handle("/labels", middleware.JWT(http.HandlerFunc(labelHandler.CreateLabel))).Methods("POST")
	r.Handle("/labels/{id}", middleware.JWT(http.HandlerFunc(labelHandler.UpdateLabel))).Methods("PUT")
	r.Handle("/labels/{id}", middleware.JWT(http.HandlerFunc(labelHandler.DeleteLabel))).Methods("DELETE")

	// ========== COMMENTS ==========
	r.Handle("/comments", middleware.JWT(http.HandlerFunc(taskHandler.CreateComment))).Methods("POST")
	r.Handle("/comments", middleware.JWT(http.HandlerFunc(taskHandler.GetComments))).Methods("GET")
	r.Handle("/comments/{id}", middleware.JWT(http.HandlerFunc(taskHandler.DeleteComment))).Methods("DELETE")

	// ========== INVITATIONS ==========
	r.HandleFunc("/accept-invite", func(w http.ResponseWriter, r *http.Request) {
		invitationHandler := &handlers.InvitationHandler{DB: db}
		invitationHandler.AcceptInvite(w, r)
	}).Methods("GET")

	// ========== ФРОНТЕНД ==========
	r.PathPrefix("/").Handler(http.StripPrefix("/", http.FileServer(http.Dir("./frontend"))))

	// ========== CORS ==========
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	utils.LogInfo("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
