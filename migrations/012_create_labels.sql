-- Таблица меток
CREATE TABLE IF NOT EXISTS labels (
    id SERIAL PRIMARY KEY,
    board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- Индексы
CREATE INDEX idx_labels_board_id ON labels(board_id);
CREATE INDEX idx_labels_deleted_at ON labels(deleted_at);