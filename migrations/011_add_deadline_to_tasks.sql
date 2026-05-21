-- Добавляем поле deadline в таблицу tasks
ALTER TABLE tasks ADD COLUMN deadline TIMESTAMP NULL;

-- Индекс для быстрого поиска по дедлайну
CREATE INDEX idx_tasks_deadline ON tasks(deadline);