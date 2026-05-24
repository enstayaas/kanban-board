package integration

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"testing"

	"kanban/handlers"
	"kanban/middleware"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

var testDB *sql.DB
var testRouter *mux.Router

func TestMain(m *testing.M) {
	// Подключение к тестовой БД
	connStr := "host=localhost port=5432 user=postgres password=aliya020507 dbname=Kanban-Board sslmode=disable"

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Cannot connect to test DB:", err)
	}

	testDB = db

	// Настройка роутера
	authHandler := &handlers.AuthHandler{DB: testDB}
	boardHandler := &handlers.BoardHandler{DB: testDB}
	taskHandler := &handlers.TaskHandler{DB: testDB}

	r := mux.NewRouter()
	r.HandleFunc("/register", authHandler.Register).Methods("POST")
	r.HandleFunc("/login", authHandler.Login).Methods("POST")
	r.HandleFunc("/health", healthHandler).Methods("GET")
	r.Handle("/boards", middleware.JWT(http.HandlerFunc(boardHandler.GetBoards))).Methods("GET")
	r.Handle("/boards", middleware.JWT(http.HandlerFunc(boardHandler.CreateBoard))).Methods("POST")
	r.Handle("/tasks", middleware.JWT(http.HandlerFunc(taskHandler.GetTasks))).Methods("GET")
	r.Handle("/tasks", middleware.JWT(http.HandlerFunc(taskHandler.CreateTask))).Methods("POST")

	testRouter = r

	code := m.Run()

	testDB.Close()
	os.Exit(code)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}
