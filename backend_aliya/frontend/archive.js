// frontend/archive.js

const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

async function fetchAPI(url, options = {}) {
    const token = localStorage.getItem('token');
    
    // Автоматически добавляем API_BASE_URL, если путь относительный
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(fullUrl, {
        ...options,
        headers: headers
    });
    
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
}


async function loadArchivedTasks() {
    const container = document.getElementById('archiveContainer');
    if (!container) return;
    container.innerHTML = '<div class="loader">Загрузка...</div>';
    
    try {
        const tasks = await fetchAPI('/tasks/archive');
        renderArchive(tasks);
    } catch (error) {
        container.innerHTML = `<div class="empty-state">⚠️ Ошибка загрузки архива: ${error.message}</div>`;
    }
}

// Рендеринг таблицы задач
function renderArchive(tasks) {
    const container = document.getElementById('archiveContainer');
    if (!container) return;

    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 В архиве нет задач</div>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'archive-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th><th>Название</th><th>Описание</th><th>Архивирована</th><th>Действие</th>
            </tr>
        </thead>
        <tbody id="archiveTableBody"></tbody>
    `;
    container.innerHTML = '';
    container.appendChild(table);

    const tbody = document.getElementById('archiveTableBody');
    tasks.forEach(task => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = task.id;
        row.insertCell(1).innerText = task.title || '—';
        row.insertCell(2).innerText = (task.description || '').substring(0, 50);
        
        // Используем task.deleted_at
        row.insertCell(3).innerText = task.deleted_at ? new Date(task.deleted_at).toLocaleString() : '—';
        
        const actionCell = row.insertCell(4);
        
        // Создаем контейнер для ровного размещения кнопок в ряд
        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '8px';
        btnGroup.style.justifyContent = 'center';

        // 1. Кнопка "Восстановить"
        const restoreBtn = document.createElement('button');
        restoreBtn.innerText = '↺ Восстановить';
        restoreBtn.className = 'restore-btn';
        restoreBtn.onclick = () => restoreTask(task.id);
        btnGroup.appendChild(restoreBtn);

        // 2. Кнопка "Удалить навсегда"
        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = '🗑️ Удалить';
        deleteBtn.className = 'delete-btn';
        
        // Кастомный стиль для красной кнопки удаления
        deleteBtn.style.backgroundColor = '#ef4444';
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        deleteBtn.style.padding = '6px 12px';
        deleteBtn.style.borderRadius = '6px';
        deleteBtn.style.cursor = 'pointer';
        
        deleteBtn.onclick = () => permanentlyDeleteTask(task.id);
        btnGroup.appendChild(deleteBtn);

        actionCell.appendChild(btnGroup);
    });
}

// Окончательное удаление ДОСКИ навсегда (Вынесено из цикла в глобальную область)
async function permanentlyDeleteBoard(boardId) {
    if (!confirm('🚨 ВНИМАНИЕ! Вы хотите удалить ВСЮ ДОСКУ навсегда? Все колонки, задачи и комментарии внутри неё будут безвозвратно стёрты! Продолжить?')) return;

    try {
        await fetchAPI(`/boards/${boardId}/permanent`, { method: 'DELETE' });
        alert('💥 Доска полностью стёрта из системы.');
        
        // РЕДИРЕКТ НА ГЛАВНУЮ: вместо перезагрузки текущей страницы архива перекидываем пользователя на index.html
        window.location.href = 'index.html'; 
    } catch (error) {
        alert('❌ Ошибка удаления доски: ' + error.message);
    }
}

// Восстановление задачи на канбан-доску
async function restoreTask(taskId) {
    if (!confirm('Восстановить задачу? Она появится на доске в той же колонке.')) return;
    
    try {
        await fetchAPI(`/tasks/${taskId}/restore`, { method: 'PATCH' });
        alert('✅ Задача восстановлена');
        loadArchivedTasks(); 
        if (window.opener && !window.opener.closed) {
            window.opener.loadTasks?.();
        }
    } catch (error) {
        alert('❌ Ошибка восстановления: ' + error.message);
    }
}

// Окончательное удаление задачи (навсегда)
async function permanentlyDeleteTask(taskId) {
    if (!confirm('🚨 Вы уверены, что хотите удалить эту задачу навсегда? Это действие нельзя отменить.')) return;

    try {
        await fetchAPI(`/tasks/${taskId}/permanent`, { method: 'DELETE' });
        alert('💥 Задача полностью удалена из базы данных.');
        loadArchivedTasks(); // Обновляем таблицу
        
        if (window.opener && !window.opener.closed) {
            window.opener.loadTasks?.();
        }
    } catch (error) {
        alert('❌ Ошибка удаления: ' + error.message);
    }
}

// ===== ПЕРЕКЛЮЧЕНИЕ ТЕМЫ =====
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme');

if (savedTheme === 'light') {
    document.body.classList.remove('dark');
    document.body.classList.add('light');
    if (themeToggle) themeToggle.textContent = '🌙 Тёмная тема';
} else {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
    if (themeToggle) themeToggle.textContent = '☀️ Светлая тема';
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('dark')) {
            document.body.classList.remove('dark');
            document.body.classList.add('light');
            localStorage.setItem('theme', 'light');
            themeToggle.textContent = '🌙 Тёмная тема';
        } else {
            document.body.classList.remove('light');
            document.body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            themeToggle.textContent = '☀️ Светлая тема';
        }
    });
}

document.addEventListener('DOMContentLoaded', loadArchivedTasks);