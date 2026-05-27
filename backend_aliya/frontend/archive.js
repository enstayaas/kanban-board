// frontend/archive.js

const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// async function fetchAPI(url, options = {}) {
//     const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//     const response = await fetch(fullUrl, {
//         ...options,
//         headers: { 'Content-Type': 'application/json', ...options.headers }
//     });
//     if (!response.ok) {
//         let errorMsg = `HTTP ${response.status}`;
//         try {
//             const err = await response.json();
//             errorMsg = err.error || err.message || errorMsg;
//         } catch(e) {}
//         throw new Error(errorMsg);
//     }
//     if (response.status === 204) return null;
//     return response.json();
// }

async function fetchAPI(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
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
    container.innerHTML = '<div class="loader">Загрузка...</div>';
    
    try {
        const tasks = await fetchAPI('/tasks/archive');
        renderArchive(tasks);
    } catch (error) {
        container.innerHTML = `<div class="empty-state">⚠️ Ошибка загрузки архива: ${error.message}</div>`;
    }
}

function renderArchive(tasks) {
    const container = document.getElementById('archiveContainer');
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
        row.insertCell(3).innerText = task.archived_at ? new Date(task.archived_at).toLocaleString() : '—';
        const actionCell = row.insertCell(4);
        const restoreBtn = document.createElement('button');
        restoreBtn.innerText = '↺ Восстановить';
        restoreBtn.className = 'restore-btn';
        restoreBtn.onclick = () => restoreTask(task.id);
        actionCell.appendChild(restoreBtn);
    });
}

async function restoreTask(taskId) {
    if (!confirm('Восстановить задачу? Она появится на доске в той же колонке.')) return;
    
    try {
        await fetchAPI(`/tasks/${taskId}/restore`, { method: 'PATCH' });
        alert('✅ Задача восстановлена');
        loadArchivedTasks(); // обновить список
        // Если основная доска открыта, можно обновить её (опционально)
        if (window.opener && !window.opener.closed) {
            window.opener.loadTasks?.();
        }
    } catch (error) {
        alert('❌ Ошибка восстановления: ' + error.message);
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