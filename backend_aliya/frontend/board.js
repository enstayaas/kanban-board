// frontend/board.js
const API_BASE_URL = 'http://localhost:8081';
let currentBoardId = null;
let currentTaskId = null;
let currentColumnId = null;
let currentPage = 1;
let perPage = 10;
let searchQuery = '';
let selectedLabelFilters = [];
let labels = [];
let allTasks = [];

// Получение ID доски из URL
const urlParams = new URLSearchParams(window.location.search);
currentBoardId = urlParams.get('id');

// Загрузка меток
async function loadLabels() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const response = await fetch(`${API_BASE_URL}/labels?board_id=${currentBoardId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            labels = await response.json();
            renderLabelsList();
            renderLabelFilters();
        }
    } catch (error) {
        console.error('Error loading labels:', error);
    }
}

function renderLabelsList() {
    const container = document.getElementById('labelsList');
    if (!container) return;
    if (!labels || labels.length === 0) {
        container.innerHTML = '<div>Нет меток. Создайте первую!</div>';
        return;
    }
    container.innerHTML = labels.map(label => `
        <span class="label" style="background: ${label.color};">${escapeHtml(label.name)}</span>
    `).join('');
}

function renderLabelFilters() {
    const container = document.getElementById('labelFilters');
    if (!container) return;
    if (!labels || labels.length === 0) {
        container.innerHTML = '<div>Создайте метки для фильтрации</div>';
        return;
    }
    container.innerHTML = labels.map(label => `
        <span class="label-filter ${selectedLabelFilters.includes(label.id) ? 'active' : ''}" 
              style="background: ${label.color};"
              onclick="toggleLabelFilter(${label.id})">${escapeHtml(label.name)}</span>
    `).join('');
}

function toggleLabelFilter(labelId) {
    if (selectedLabelFilters.includes(labelId)) {
        selectedLabelFilters = selectedLabelFilters.filter(id => id !== labelId);
    } else {
        selectedLabelFilters.push(labelId);
    }
    renderLabelFilters();
    loadBoardTasks();
}

function clearLabelFilter() {
    selectedLabelFilters = [];
    renderLabelFilters();
    loadBoardTasks();
}

async function createLabel() {
    const name = document.getElementById('newLabelName').value.trim();
    const color = document.getElementById('newLabelColor').value;
    if (!name) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE_URL}/labels`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, color, board_id: currentBoardId })
        });
        if (response.ok) {
            document.getElementById('newLabelName').value = '';
            loadLabels();
        }
    } catch (error) {
        console.error('Error creating label:', error);
    }
}

// Загрузка доски
async function loadBoard() {
    if (!currentBoardId) {
        window.location.href = 'index.html';
        return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    try {
        const boardRes = await fetch(`${API_BASE_URL}/boards/${currentBoardId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (boardRes.ok) {
            const board = await boardRes.json();
            document.getElementById('boardTitle').innerHTML = board.title || 'Доска';
        }
        await loadBoardTasks();
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadBoardTasks() {
    const token = localStorage.getItem('token');
    try {
        const columnsResponse = await fetch(`${API_BASE_URL}/columns?board_id=${currentBoardId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (columnsResponse.ok) {
            const columns = await columnsResponse.json();
            await renderColumns(columns);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

async function renderColumns(columns) {
    const container = document.getElementById('columnsContainer');
    const token = localStorage.getItem('token');
    if (!columns || columns.length === 0) {
        container.innerHTML = '<div class="empty-column">Нет колонок. Нажмите "+ Добавить колонку"</div>';
        return;
    }
    container.innerHTML = '';
    for (const column of columns) {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'column';
        columnDiv.dataset.columnId = column.id;
        let tasks = [];
        try {
            const tasksResponse = await fetch(`${API_BASE_URL}/tasks?column_id=${column.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (tasksResponse.ok) {
                const data = await tasksResponse.json();
                tasks = data.data || data;
                if (!Array.isArray(tasks)) tasks = [];
            }
        } catch (error) {}
        columnDiv.innerHTML = `
            <div class="column-header">
                <span class="column-title">${escapeHtml(column.title)}</span>
                <button onclick="deleteColumn(${column.id})" style="background:none; border:none; cursor:pointer; color:#ef4444;"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="task-list" data-column-id="${column.id}">
                ${tasks.map(task => `
                    <div class="task-card" data-task-id="${task.id}" onclick="editTask(${task.id})">
                        <div class="task-title">${escapeHtml(task.title)}</div>
                        <span class="task-priority priority-${task.priority}">${task.priority === 'high' ? '🔴 Высокий' : task.priority === 'medium' ? '🟡 Средний' : '🟢 Низкий'}</span>
                    </div>
                `).join('')}
            </div>
            <button class="add-task-btn" onclick="showAddTaskModal(${column.id})"><i class="fa-solid fa-plus"></i> Добавить задачу</button>
        `;
        container.appendChild(columnDiv);
        const taskList = columnDiv.querySelector('.task-list');
        if (taskList && typeof Sortable !== 'undefined') {
            new Sortable(taskList, {
                group: 'tasks',
                animation: 200,
                onEnd: async (evt) => {
                    const taskId = evt.item.dataset.taskId;
                    const newColumnId = evt.to.dataset.columnId;
                    if (taskId && newColumnId) {
                        await updateTaskPosition(taskId, newColumnId);
                    }
                }
            });
        }
    }
}

async function updateTaskPosition(taskId, newColumnId) {
    const token = localStorage.getItem('token');
    try {
        await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ column_id: parseInt(newColumnId) })
        });
        loadBoardTasks();
    } catch (error) {
        console.error('Error:', error);
    }
}

async function createColumn() {
    const title = document.getElementById('columnTitle').value.trim();
    if (!title) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE_URL}/columns`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ board_id: parseInt(currentBoardId), title: title })
        });
        if (response.ok) {
            closeColumnModal();
            loadBoardTasks();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteColumn(columnId) {
    if (!confirm('Удалить колонку?')) return;
    const token = localStorage.getItem('token');
    try {
        await fetch(`${API_BASE_URL}/columns/${columnId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadBoardTasks();
    } catch (error) {
        console.error('Error:', error);
    }
}

function showAddTaskModal(columnId) {
    currentColumnId = columnId;
    currentTaskId = null;
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskModal').style.display = 'flex';
}

async function editTask(taskId) {
    currentTaskId = taskId;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const task = await response.json();
            document.getElementById('taskTitle').value = task.title || '';
            document.getElementById('taskDesc').value = task.description || '';
            document.getElementById('taskPriority').value = task.priority || 'medium';
            document.getElementById('taskModal').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function saveTask() {
    const title = document.getElementById('taskTitle').value.trim();
    if (!title) return;
    const token = localStorage.getItem('token');
    const taskData = {
        title: title,
        description: document.getElementById('taskDesc').value,
        priority: document.getElementById('taskPriority').value
    };
    try {
        let response;
        if (currentTaskId) {
            response = await fetch(`${API_BASE_URL}/tasks/${currentTaskId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });
        } else {
            taskData.column_id = currentColumnId;
            response = await fetch(`${API_BASE_URL}/tasks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });
        }
        if (response.ok) {
            closeTaskModal();
            loadBoardTasks();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function openCreateModal() {
    document.getElementById('createTitle').value = '';
    document.getElementById('createDesc').value = '';
    document.getElementById('createPriority').value = 'medium';
    document.getElementById('createAssignedTo').value = '';
    document.getElementById('createColumnId').value = '1';
    document.getElementById('createModal').style.display = 'flex';
}

async function createTask() {
    const title = document.getElementById('createTitle').value.trim();
    if (!title) return;
    const token = localStorage.getItem('token');
    try {
        await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                description: document.getElementById('createDesc').value,
                priority: document.getElementById('createPriority').value,
                column_id: parseInt(document.getElementById('createColumnId').value),
                assigned_to: parseInt(document.getElementById('createAssignedTo').value) || 0
            })
        });
        closeCreateModal();
        loadBoardTasks();
    } catch (error) {
        console.error('Error:', error);
    }
}

function applyFilter() { loadBoardTasks(); }
function clearFilters() { loadBoardTasks(); }
function applySortAndPage() { loadBoardTasks(); }
function prevPage() { if (currentPage > 1) { currentPage--; loadBoardTasks(); } }
function nextPage() { currentPage++; loadBoardTasks(); }
function changePerPage() { perPage = parseInt(document.getElementById('perPage').value); currentPage = 1; loadBoardTasks(); }

function closeTaskModal() { document.getElementById('taskModal').style.display = 'none'; }
function closeCreateModal() { document.getElementById('createModal').style.display = 'none'; }
function showAddColumnModal() { document.getElementById('columnTitle').value = ''; document.getElementById('columnModal').style.display = 'flex'; }
function closeColumnModal() { document.getElementById('columnModal').style.display = 'none'; }

function escapeHtml(text) { if (!text) return ''; return text.replace(/[&<>]/g, function(m) { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; }); }


// Тёмная тема
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.remove('dark'); document.body.classList.add('light');
} else {
    document.body.classList.add('dark'); document.body.classList.remove('light');
}
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark'); document.body.classList.toggle('light');
        localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    });
}

// Закрытие модальных окон
document.getElementById('taskModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('taskModal')) closeTaskModal(); });
document.getElementById('createModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('createModal')) closeCreateModal(); });
document.getElementById('columnModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('columnModal')) closeColumnModal(); });

// Запуск
document.addEventListener('DOMContentLoaded', () => {
    loadBoard();
    loadLabels();
});