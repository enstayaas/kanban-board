package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

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

	// Динамически получаем параметры базы данных (из Докера или локально)
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost" // Резервный вариант для запуска через обычный go run
	}

	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5433"
	}

	user := os.Getenv("DB_USER")
	if user == "" {
		user = "postgres"
	}

	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "postgres123"
	}

	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = "kanban"
	}

	// Собираем правильную строку подключения
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

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

	// ==========================================
	// ⚡ ЗАПУСК АВТОМАТИЧЕСКОГО УДАЛЕНИЯ ЧЕРЕЗ 5 ДНЕЙ
	// ==========================================
	handlers.StartTrashCleaner(db)

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
	userHandler := &handlers.UserHandler{DB: db}
	statsHandler := &handlers.StatsHandler{DB: db}

	r := mux.NewRouter()

	// Безопасный перехватчик паник (восстанавливает сервер при критическом сбое)
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					log.Printf("🔥 КРИТИЧЕСКАЯ ПАНИКА СЕРВЕРА: %v", err)
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusInternalServerError)
					fmt.Fprintf(w, `{"error":"Internal Server Error","details":"%v"}`, err)
				}
			}()
			next.ServeHTTP(w, r)
		})
	})

	// Твой старый код логирования (идет следом)
	r.Use(middleware.LoggingMiddleware)

	// ========== ПУБЛИЧНЫЕ МАРШРУТЫ ==========
	r.HandleFunc("/register", authHandler.Register).Methods("POST")
	r.HandleFunc("/login", authHandler.Login).Methods("POST")
	r.HandleFunc("/health", healthHandler).Methods("GET")

	// ========== USERS ==========
	r.Handle("/users", middleware.JWT(http.HandlerFunc(userHandler.GetUsers))).Methods("GET")
	r.Handle("/users/{id}", middleware.JWT(http.HandlerFunc(userHandler.GetUserByID))).Methods("GET")
	r.Handle("/users/{id}", middleware.JWT(http.HandlerFunc(userHandler.UpdateUser))).Methods("PUT")

	// ========== BOARDS ==========
	r.Handle("/boards/deleted", middleware.JWT(http.HandlerFunc(boardHandler.GetDeletedBoards))).Methods("GET")
	r.Handle("/boards/{id}/permanent", middleware.JWT(http.HandlerFunc(boardHandler.PermanentDeleteBoard))).Methods("DELETE")
	r.Handle("/boards", middleware.JWT(http.HandlerFunc(boardHandler.GetBoards))).Methods("GET")
	r.Handle("/boards", middleware.JWT(http.HandlerFunc(boardHandler.CreateBoard))).Methods("POST")
	r.Handle("/boards/{id}", middleware.JWT(http.HandlerFunc(boardHandler.GetBoard))).Methods("GET")
	r.Handle("/boards/{id}", middleware.JWT(http.HandlerFunc(boardHandler.UpdateBoard))).Methods("PUT")
	r.Handle("/boards/{id}", middleware.JWT(middleware.OwnerOnly(db, boardHandler.DeleteBoard))).Methods("DELETE")
	r.Handle("/boards/{id}/members", middleware.JWT(middleware.OwnerOnly(db, boardHandler.GetMembers))).Methods("GET")
	r.Handle("/boards/{id}/members", middleware.JWT(middleware.OwnerOnly(db, boardHandler.AddMemberToBoard))).Methods("POST")

	// ========== COLUMNS ==========
	r.Handle("/columns", middleware.JWT(middleware.OwnerOnly(db, columnHandler.GetColumns))).Methods("GET")
	r.Handle("/columns", middleware.JWT(http.HandlerFunc(columnHandler.CreateColumn))).Methods("POST")
	r.Handle("/columns/{id}", middleware.JWT(middleware.OwnerOnly(db, columnHandler.DeleteColumn))).Methods("DELETE")
	r.Handle("/columns/{id}/restore", middleware.JWT(middleware.OwnerOnly(db, columnHandler.RestoreColumn))).Methods("PATCH")

	// ========== TASKS ARCHIVE ==========
	r.Handle("/tasks/archive", middleware.JWT(http.HandlerFunc(taskHandler.GetArchivedTasks))).Methods("GET")
	r.Handle("/tasks/archive/clean", middleware.JWT(http.HandlerFunc(taskHandler.CleanTrash))).Methods("DELETE")

	// ========== TASKS ==========
	r.Handle("/tasks", middleware.JWT(http.HandlerFunc(taskHandler.GetTasks))).Methods("GET")
	r.Handle("/tasks", middleware.JWT(http.HandlerFunc(taskHandler.CreateTask))).Methods("POST")
	r.Handle("/tasks/{id}", middleware.JWT(http.HandlerFunc(taskHandler.UpdateTask))).Methods("PUT")
	r.Handle("/tasks/{id}", middleware.JWT(http.HandlerFunc(taskHandler.DeleteTask))).Methods("DELETE")
	r.Handle("/tasks/{id}/archive", middleware.JWT(http.HandlerFunc(taskHandler.ArchiveTask))).Methods("PATCH")
	r.Handle("/tasks/{id}/restore", middleware.JWT(http.HandlerFunc(taskHandler.RestoreTask))).Methods("PATCH")
	r.Handle("/tasks/{id}/permanent", middleware.JWT(http.HandlerFunc(taskHandler.PermanentDeleteTask))).Methods("DELETE")

	// ========== TASK LABELS ==========
	r.Handle("/tasks/{id}/labels", middleware.JWT(http.HandlerFunc(taskHandler.GetTaskLabels))).Methods("GET")
	r.Handle("/tasks/{id}/labels", middleware.JWT(http.HandlerFunc(taskHandler.AddLabelToTask))).Methods("POST")
	r.Handle("/tasks/{id}/labels/{labelId}", middleware.JWT(http.HandlerFunc(taskHandler.RemoveLabelFromTask))).Methods("DELETE")

	// ========== LABELS ==========
	r.Handle("/labels", middleware.JWT(http.HandlerFunc(labelHandler.GetLabels))).Methods("GET")
	r.Handle("/labels", middleware.JWT(http.HandlerFunc(labelHandler.CreateLabel))).Methods("POST")
	r.Handle("/labels/{id}", middleware.JWT(http.HandlerFunc(labelHandler.UpdateLabel))).Methods("PUT")
	r.Handle("/labels/{id}", middleware.JWT(http.HandlerFunc(labelHandler.DeleteLabel))).Methods("DELETE")

	// ========== COMMENTS ==========
	r.Handle("/comments", middleware.JWT(http.HandlerFunc(taskHandler.GetComments))).Methods("GET")
	r.Handle("/comments", middleware.JWT(http.HandlerFunc(taskHandler.CreateComment))).Methods("POST")
	r.Handle("/comments/{id}", middleware.JWT(http.HandlerFunc(taskHandler.DeleteComment))).Methods("DELETE")

	// ========== INVITATIONS ==========
	r.HandleFunc("/accept-invite", func(w http.ResponseWriter, r *http.Request) {
		invitationHandler := &handlers.InvitationHandler{DB: db}
		invitationHandler.AcceptInvite(w, r)
	}).Methods("GET")

	// ========== STATS ==========
	r.Handle("/stats", middleware.JWT(http.HandlerFunc(statsHandler.GetStats))).Methods("GET")

	// ========== ФРОНТЕНД ==========
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./frontend")))

	// ========== CORS ==========
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	utils.LogInfo("Server running on :8081")
	log.Fatal(http.ListenAndServe(":8081", handler))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
