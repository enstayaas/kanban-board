-- ============================================
-- Индексы для оптимизации запросов в Kanban Board
-- ============================================

-- 1. Индексы для таблицы tasks (задачи)
CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON tasks(archived_at);
CREATE INDEX IF NOT EXISTS idx_tasks_done_at ON tasks(done_at);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Составные индексы для частых запросов
CREATE INDEX IF NOT EXISTS idx_tasks_column_status ON tasks(column_id, deleted_at, archived_at);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assigned_to, column_id, deleted_at);

-- 2. Индексы для таблицы boards (доски)
CREATE INDEX IF NOT EXISTS idx_boards_owner_id ON boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_boards_deleted_at ON boards(deleted_at);

-- 3. Индексы для таблицы columns (колонки)
CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_columns_deleted_at ON columns(deleted_at);
CREATE INDEX IF NOT EXISTS idx_columns_position ON columns(position);

-- 4. Индексы для таблицы board_members (участники)
CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);
CREATE INDEX IF NOT EXISTS idx_board_members_role ON board_members(role);

-- 5. Индексы для таблицы comments (комментарии)
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON comments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- 6. Индексы для таблицы labels (метки)
CREATE INDEX IF NOT EXISTS idx_labels_board_id ON labels(board_id);
CREATE INDEX IF NOT EXISTS idx_labels_deleted_at ON labels(deleted_at);
CREATE INDEX IF NOT EXISTS idx_labels_name ON labels(name);

-- 7. Индексы для таблицы task_labels (связь задач и меток)
CREATE INDEX IF NOT EXISTS idx_task_labels_task_id ON task_labels(task_id);
CREATE INDEX IF NOT EXISTS idx_task_labels_label_id ON task_labels(label_id);

-- 8. Индексы для таблицы invitations (приглашения)
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_board_id ON invitations(board_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- 9. Индексы для таблицы activities (активность)
CREATE INDEX IF NOT EXISTS idx_activities_board_id ON activities(board_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_action ON activities(action);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);

-- 10. Индексы для таблицы users (пользователи)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);