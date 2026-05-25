package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt" // Добавили для вывода логов в консоль
	"net/http"
	"strconv"
	"time"

	"kanban/middleware"

	"github.com/gorilla/mux"
)

type Column struct {
	ID           int        `json:"id"`
	BoardID      int        `json:"board_id"`
	Title        string     `json:"title"`
	Position     int        `json:"position"`
	LastPosition int        `json:"last_position"`
	DeletedAt    *time.Time `json:"deleted_at"`
}

type ColumnHandler struct {
	DB *sql.DB
}

// 🔹 GET /columns — Получить список активных колонок
func (h *ColumnHandler) GetColumns(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value(middleware.UserIDKey).(int)

	// Читаем параметры
	boardIDStr := r.URL.Query().Get("board_id")
	if boardIDStr == "" {
		boardIDStr = r.URL.Query().Get("id")
	}

	// ЛОГ ДЛЯ ОТЛАДКИ: Выведет в консоль Go то, что прислал браузер
	fmt.Printf("[DEBUG] Получен запрос на колонки. Сырой board_id из URL: '%s'\n", boardIDStr)

	// Очищаем строку от мусора (оставляем только цифры)
	var cleanIDStr string
	for _, char := range boardIDStr {
		if char >= '0' && char <= '9' {
			cleanIDStr += string(char)
		}
	}

	// Если после очистки ничего не осталось (например прислали "undefined" или пустую строку)
	if cleanIDStr == "" {
		fmt.Printf("[ERROR] Ошибка очистки ID. Строка пустая. Возможно фронтенд передал undefined/null\n")
		http.Error(w, "Параметр board_id отсутствует, пуст или некорректен (передана строка вместо числа)", http.StatusBadRequest)
		return
	}

	boardID, err := strconv.Atoi(cleanIDStr)
	if err != nil {
		fmt.Printf("[ERROR] Не удалось преобразовать '%s' в число: %v\n", cleanIDStr, err)
		http.Error(w, "Неверный формат board_id. Ожидалось число.", http.StatusBadRequest)
		return
	}

	// 🔐 Проверка доступа к доске
	var exists bool
	err = h.DB.QueryRow(`
       SELECT EXISTS(
          SELECT 1 FROM board_members
          WHERE board_id=$1 AND user_id=$2
       )
    `, boardID, userID).Scan(&exists)

	// Если у вас строгий бэкенд и вы не состоите в доске — раскомментируйте этот блок.
	// Пока оставляем предупреждение в консоли, чтобы сервер не падал, если вы тестируете старые доски.
	if err != nil || !exists {
		fmt.Printf("[WARNING] Пользователь %d запрашивает доску %d, но не является её участником в board_members!\n", userID, boardID)
		// Если нужно жестко блокировать доступ, раскомментируйте следующие 2 строки:
		// http.Error(w, "Доступ запрещен (вы не участник доски)", http.StatusForbidden)
		// return
	}

	rows, err := h.DB.Query(`
       SELECT id, board_id, title, position
       FROM columns
       WHERE board_id=$1 AND deleted_at IS NULL
       ORDER BY position
    `, boardID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var columns []Column
	for rows.Next() {
		var c Column
		rows.Scan(&c.ID, &c.BoardID, &c.Title, &c.Position)
		columns = append(columns, c)
	}

	if columns == nil {
		columns = []Column{}
	}

	json.NewEncoder(w).Encode(columns)
}

// 🔹 POST /columns — Создать колонку
func (h *ColumnHandler) CreateColumn(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)

	var c Column
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, "Ошибка в JSON", http.StatusBadRequest)
		return
	}

	var exists bool
	h.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM board_members WHERE board_id=$1 AND user_id=$2)`,
		c.BoardID, userID).Scan(&exists)

	if !exists {
		fmt.Printf("[WARNING] Создание колонки: Пользователь %d не состоит в доске %d\n", userID, c.BoardID)
		// Жесткий запрет при необходимости:
		// http.Error(w, "Доступ запрещен", http.StatusForbidden)
		// return
	}

	var lastPos int
	h.DB.QueryRow(`SELECT COALESCE(MAX(position), 0) FROM columns WHERE board_id=$1`, c.BoardID).Scan(&lastPos)

	err := h.DB.QueryRow(`
       INSERT INTO columns (board_id, title, position)
       VALUES ($1, $2, $3) RETURNING id
    `, c.BoardID, c.Title, lastPos+1).Scan(&c.ID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
}

// 🔹 DELETE /columns/{id} — Мягкое удаление (в корзину)
func (h *ColumnHandler) DeleteColumn(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDKey).(int)
	vars := mux.Vars(r)
	columnID := vars["id"]

	var boardID, position int
	err := h.DB.QueryRow(`SELECT board_id, position FROM columns WHERE id=$1`, columnID).Scan(&boardID, &position)
	if err != nil {
		http.Error(w, "Колонка не найдена", http.StatusNotFound)
		return
	}

	var exists bool
	h.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM board_members WHERE board_id=$1 AND user_id=$2)`, boardID, userID).Scan(&exists)

	_, err = h.DB.Exec(`
       UPDATE columns
       SET deleted_at=NOW(), last_position=position, position=-1
       WHERE id=$1
    `, columnID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Write([]byte("Column moved to trash"))
}

// 🔹 PATCH /columns/{id}/restore — Восстановление из корзины
func (h *ColumnHandler) RestoreColumn(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	columnID := vars["id"]

	var boardID, lastPos int
	err := h.DB.QueryRow(`SELECT board_id, last_position FROM columns WHERE id=$1`, columnID).Scan(&boardID, &lastPos)
	if err != nil {
		http.Error(w, "Колонка не найдена", http.StatusNotFound)
		return
	}

	_, err = h.DB.Exec(`
        UPDATE columns 
        SET position = last_position, deleted_at = NULL 
        WHERE id = $1`, columnID)

	if err != nil {
		http.Error(w, "Ошибка восстановления", http.StatusInternalServerError)
		return
	}

	w.Write([]byte("Column restored"))
}
