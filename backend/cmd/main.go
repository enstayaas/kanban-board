package main

import (
	"fmt"
	"kanban/internal/handlers"
	"net/http"
	"strings"
)

func main() {

	http.HandleFunc("/register", handlers.Register)
	http.HandleFunc("/me", handlers.Me)

	http.HandleFunc("/boards/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handlers.GetBoard(w, r)
		} else if r.Method == http.MethodPut {
			handlers.UpdateBoard(w, r)
		} else if r.Method == http.MethodPost && strings.Contains(r.URL.Path, "/members") {
			handlers.AddMember(w, r)
		}
	})

	http.HandleFunc("/columns/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			handlers.UpdateColumn(w, r)
		} else if r.Method == http.MethodPatch && strings.HasSuffix(r.URL.Path, "/restore") {
			handlers.RestoreColumn(w, r)
		}
	})

	http.HandleFunc("/tasks", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handlers.GetTasks(w, r)
		} else if r.Method == http.MethodPost {
			handlers.CreateTask(w, r)
		}
	})

	// архив задач
	http.HandleFunc("/tasks/archive", handlers.GetArchivedTasks)

	// PATCH (перемещение + архив)
	http.HandleFunc("/tasks/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPatch && strings.HasSuffix(r.URL.Path, "/archive") {
			handlers.ArchiveTask(w, r)
		} else if r.Method == http.MethodPatch {
			handlers.UpdateTask(w, r)
		}
	})

	http.HandleFunc("/comments", handlers.CreateComment)

	http.Handle("/", http.FileServer(http.Dir("../frontend")))
	fmt.Println("Serving frontend from ../frontend")

	http.HandleFunc("/users", handlers.GetUsers)
	http.HandleFunc("/users/", handlers.GetUserByID)

	// http.Handle("/", http.FileServer(http.Dir("./frontend")))

	fmt.Println("Server started at :8080")
	http.ListenAndServe(":8080", nil)
}

// http.HandleFunc("/comments", func(w http.ResponseWriter, r *http.Request) {
// 	if r.Method == http.MethodPost {
// 		handlers.CreateComment(w, r)
// 	}
// })

// 👇 В САМЫЙ НИЗ!
// http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
// 	fmt.Fprintln(w, "Kanban API is running 🚀")
// })

// получить обычные задачи
// http.HandleFunc("/tasks", func(w http.ResponseWriter, r *http.Request) {
// 	if r.Method == http.MethodGet {
// 		handlers.GetTasks(w, r)
// 	} else if r.Method == http.MethodPost {
// 		handlers.CreateTask(w, r)
// 	}
// })

// архив
// http.HandleFunc("/tasks/archive", handlers.GetArchivedTasks)

// // архивировать
// http.HandleFunc("/tasks/", func(w http.ResponseWriter, r *http.Request) {
// 	if r.Method == http.MethodPatch && strings.HasSuffix(r.URL.Path, "/archive") {
// 		handlers.ArchiveTask(w, r)
// 	} else if r.Method == http.MethodPatch {
// 		handlers.UpdateTask(w, r)
// 	}
// })

// func main() {
// 	http.HandleFunc("/tasks", func(w http.ResponseWriter, r *http.Request) {
// 		if r.Method == http.MethodPost {
// 			handlers.CreateTask(w, r)
// 		}
// 	})

// 	// http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
// 	// 	fmt.Fprintln(w, "Kanban API is running 🚀")
// 	// })

// 	http.HandleFunc("/register", handlers.Register)
// 	http.HandleFunc("/me", handlers.Me)

// 	http.HandleFunc("/boards/", func(w http.ResponseWriter, r *http.Request) {
// 		if r.Method == http.MethodGet {
// 			handlers.GetBoard(w, r)
// 		} else if r.Method == http.MethodPut {
// 			handlers.UpdateBoard(w, r)
// 		} else if r.Method == http.MethodPost && strings.Contains(r.URL.Path, "/members") {
// 			handlers.AddMember(w, r)
// 		}
// 	})

// 	//Колонки добавила когда работала с колонками
// 	http.HandleFunc("/columns/", func(w http.ResponseWriter, r *http.Request) {
// 		if r.Method == http.MethodPut {
// 			handlers.UpdateColumn(w, r)
// 		} else if r.Method == http.MethodPatch && strings.HasSuffix(r.URL.Path, "/restore") {
// 			handlers.RestoreColumn(w, r)
// 		}
// 	})

// 	//Создание задачи ( Post tasks) Kan13
// 	// http.HandleFunc("/tasks", func(w http.ResponseWriter, r *http.Request) {
// 	// 	if r.Method == http.MethodPost {
// 	// 		handlers.CreateTask(w, r)
// 	// 	}
// 	// })

// 	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
// 		fmt.Fprintln(w, "Kanban API is running 🚀")
// 	})

// 	fmt.Println("Server started at :8080")
// 	http.ListenAndServe(":8080", nil)
// }
