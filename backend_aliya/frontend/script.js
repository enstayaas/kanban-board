// frontend/script.js

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentTask = null;
let isLoading = false;
let currentPage = 1;
let perPage = 10;
let currentSortBy = 'priority';
let currentSortOrder = 'desc';
let allTasks = [];
let searchQuery = '';


// Глобальная ссылка на функции из labels.js
window.getTaskLabels = getTaskLabels;
window.toggleTaskLabel = toggleTaskLabel;

const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// ========== ФУНКЦИИ УВЕДОМЛЕНИЙ ==========
function showError(message) {
    let toast = document.getElementById('errorToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'errorToast';
        toast.className = 'error-toast';
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 5000);
}

function showSuccess(message) {
    let toast = document.getElementById('successToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'successToast';
        toast.className = 'success-toast';
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

// ========== DEBOUNCE ==========
let debounceTimer;
function debounce(func, delay) {
    return function(...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
}

function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            searchQuery = e.target.value.trim();
            currentPage = 1;
            applySortAndPage();
        }, 300));
    }
}

// ========== FETCH С ТОКЕНОМ ==========
async function fetchAPI(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
        const response = await fetch(fullUrl, {
            ...options,
            headers: headers,
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            throw new Error('Сессия истекла');
        }
        
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch(e) {}
            throw new Error(errorMessage);
        }
        
        if (response.status === 204) return null;
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        showError(error.message);
        throw error;
    }
}



async function loadTasks() {
    if (isLoading) return;
    isLoading = true;
    
    const boardDiv = document.getElementById('board');
    if (boardDiv) {
        boardDiv.innerHTML = '<div style="text-align:center; padding:40px;">Загрузка задач...</div>';
    }
    
    // Колонки, которые есть на доске (ID должны быть в БД)
    const columns = [1, 2, 3]; // To Do, In Progress, Done
    
    try {
        let allTasks = [];
        
        for (const columnId of columns) {
            const data = await fetchAPI(`/tasks?column_id=${columnId}&page=${currentPage}&limit=${perPage}&sort=${currentSortBy}&order=${currentSortOrder}`);
            
            if (data && data.data) {
                allTasks.push(...data.data);
            } else if (Array.isArray(data)) {
                allTasks.push(...data);
            }
        }
        
        renderBoard(allTasks);
        
    } catch (error) {
        console.error('Load tasks error:', error);
        if (boardDiv) {
            boardDiv.innerHTML = '<div class="empty-state">⚠️ Не удалось загрузить задачи</div>';
        }
    } finally {
        isLoading = false;
    }
}

// // ========== ЗАГРУЗКА ЗАДАЧ ==========
// async function loadTasks() {
//     if (isLoading) return;
//     isLoading = true;
    
//     const boardDiv = document.getElementById('board');
//     if (boardDiv) {
//         boardDiv.innerHTML = '<div style="text-align:center; padding:40px;">Загрузка задач...</div>';
//     }
    
//     try {
//         // Получаем задачи с пагинацией от сервера
//         const data = await fetchAPI(`/tasks?page=${currentPage}&limit=${perPage}&sort=${currentSortBy}&order=${currentSortOrder}`);
        
//         // Обработка ответа с пагинацией
//         if (data && data.data) {
//             allTasks = data.data;
//             updatePaginationFromServer(data.meta);
//         } else if (Array.isArray(data)) {
//             allTasks = data;
//         } else {
//             allTasks = [];
//         }
        
//         renderBoard(allTasks);
        
//     } catch (error) {
//         console.error('Load tasks error:', error);
//         if (boardDiv) {
//             boardDiv.innerHTML = '<div class="empty-state">⚠️ Не удалось загрузить задачи</div>';
//         }
//         allTasks = [];
//     } finally {
//         isLoading = false;
//     }
// }

// Обновление пагинации из ответа сервера
function updatePaginationFromServer(meta) {
    if (!meta) return;
    const totalPages = meta.totalPages || 1;
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (pageInfo) pageInfo.innerText = `Страница ${meta.page} из ${totalPages}`;
    if (prevBtn) prevBtn.disabled = meta.page <= 1;
    if (nextBtn) nextBtn.disabled = meta.page >= totalPages;
    currentPage = meta.page;
    perPage = meta.limit;
}


async function renderBoard(tasks) {
    const boardDiv = document.getElementById('board');
    if (!boardDiv) return;
    
    // Загружаем метки для всех задач параллельно
    const tasksWithLabels = await Promise.all(tasks.map(async (task) => {
        const taskLabels = await getTaskLabelsForDisplay(task.id);
        return { ...task, labels: taskLabels };
    }));
    
    boardDiv.innerHTML = '';
    
    const columns = [
        { id: 1, title: '<i class="fa-regular fa-rectangle-list"></i> К выполнению' },
        { id: 2, title: '<i class="fa-solid fa-gear"></i> В процессе' },
        { id: 3, title: '<i class="fa-regular fa-circle-check"></i> Выполнено' }
    ];
    
    const priorityEmojis = { 'high': '🔴', 'medium': '🟡', 'low': '🟢' };
    
    columns.forEach(col => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'column';
        columnDiv.innerHTML = `<h3>${col.title}</h3>`;
        
        const tasksInColumn = tasksWithLabels.filter(t => t.column_id === col.id);
        
        if (tasksInColumn.length === 0) {
            columnDiv.innerHTML += '<div class="empty-state">✨ Нет задач</div>';
        } else {
            tasksInColumn.forEach(task => {
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task';
                
                const labelsHtml = task.labels.length > 0 
                    ? `<div class="task-labels">${task.labels.map(l => `<span class="task-label" style="background: ${l.color};">${escapeHtml(l.name)}</span>`).join('')}</div>`
                    : '';
                
                taskDiv.innerHTML = `
                    <div>${priorityEmojis[task.priority] || '⚪'} <strong>${escapeHtml(task.title)}</strong></div>
                    ${labelsHtml}
                    <div style="font-size: 10px; color: #888;"><i class="fa-regular fa-user"></i> ${getUserName(task.assigned_to)}</div>
                `;
                
                taskDiv.onclick = () => openModal(task);
                columnDiv.appendChild(taskDiv);
            });
        }
        
        boardDiv.appendChild(columnDiv);
    });
}





// ========== ОТРИСОВКА ДОСКИ ==========
// function renderBoard(tasks) {
//     const boardDiv = document.getElementById('board');
//     if (!boardDiv) return;
//     boardDiv.innerHTML = '';
    
//     const columns = [
//         { id: 1, title: '<i class="fa-regular fa-rectangle-list"></i> To Do' },
//         { id: 2, title: '<i class="fa-solid fa-gear"></i> In Progress' },
//         { id: 3, title: '<i class="fa-regular fa-circle-check"></i> Done' }
//     ];
    
//     const priorityEmojis = { 'high': '🔴', 'medium': '🟡', 'low': '🟢' };
    
//     columns.forEach(col => {
//         const columnDiv = document.createElement('div');
//         columnDiv.className = 'column';
//         columnDiv.innerHTML = `<h3>${col.title}</h3>`;
        
//         const tasksInColumn = tasks.filter(t => t.column_id === col.id);
        
//         if (tasksInColumn.length === 0) {
//             columnDiv.innerHTML += '<div class="empty-state">✨ Нет задач</div>';
//         } else {
//             tasksInColumn.forEach(task => {
//                 const taskDiv = document.createElement('div');
//                 taskDiv.className = 'task';
//                 taskDiv.innerHTML = `
//                     <div>${priorityEmojis[task.priority] || '⚪'} <strong>${escapeHtml(task.title)}</strong></div>
//                     <div style="font-size: 10px; color: #888;"><i class="fa-regular fa-user"></i> ${getUserName(task.assigned_to)}</div>
//                 `;
//                 taskDiv.onclick = () => openModal(task);
//                 columnDiv.appendChild(taskDiv);
//             });
//         }
        
//         boardDiv.appendChild(columnDiv);
//     });
// }

// ========== ДОСКИ ==========
let currentBoardId = localStorage.getItem('currentBoardId') || 1;

async function loadBoards() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const data = await fetchAPI('/boards');
        const boards = data.data || data;
        renderBoardsList(boards);
    } catch (error) {
        console.error('Error loading boards:', error);
    }
}

function renderBoardsList(boards) {
    const boardList = document.getElementById('board-list');
    if (!boardList) return;
    if (!boards || boards.length === 0) {
        boardList.innerHTML = '<div>Нет досок</div>';
        return;
    }
    boardList.innerHTML = boards.map(board => `
        <div class="board-item" data-id="${board.id}" onclick="switchBoard(${board.id})">
            <strong>${escapeHtml(board.title)}</strong>
        </div>
    `).join('');
}

async function switchBoard(boardId) {
    currentBoardId = boardId;
    localStorage.setItem('currentBoardId', boardId);
    currentPage = 1;
    await loadTasks();
}

async function createBoard(title, description = '') {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        await fetchAPI('/boards', {
            method: 'POST',
            body: JSON.stringify({ title, description })
        });
        await loadBoards();
    } catch (error) {
        console.error('Error creating board:', error);
    }
}

function showCreateBoardModal() {
    const title = prompt('Введите название доски:');
    if (title) createBoard(title);
}

// ========== СОРТИРОВКА И ПАГИНАЦИЯ ==========
function applySortAndPage() {
    loadTasks();
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadTasks();
    }
}

function nextPage() {
    currentPage++;
    loadTasks();
}

function changePerPage() {
    perPage = parseInt(document.getElementById('perPage')?.value || 10);
    currentPage = 1;
    loadTasks();
}

function applyFilter() {
    currentPage = 1;
    loadTasks();
}

function clearFilters() {
    document.getElementById('priorityFilter').value = '';
    document.getElementById('userFilter').value = '';
    document.getElementById('searchInput').value = '';
    searchQuery = '';
    currentPage = 1;
    loadTasks();
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

const usersList = {
    1: { name: "Анна Смирнова" },
    2: { name: "Борис Петров" },
    3: { name: "Виктор Сидоров" },
    4: { name: "Дарья Кузнецова" },
    5: { name: "Елена Морозова" },
    6: { name: "Максим Иванов" },
    7: { name: "Ольга Соколова" },
    8: { name: "Игорь Васильев" }
};

function getUserName(userId) {
    if (!userId || userId === 0) return "Не назначен";
    return usersList[userId]?.name || `Пользователь ${userId}`;
}


async function openModal(task) {
    currentTask = task;
    document.getElementById('editTitle').value = task.title || '';
    document.getElementById('editDesc').value = task.description || '';
    document.getElementById('editPriority').value = task.priority || 'medium';
    document.getElementById('editAssignedTo').value = task.assigned_to || '';

    // ===== ОТРИСОВКА МЕТОК =====
    const container = document.getElementById('modalTaskLabels');
    if (container && window.labels && window.labels.length > 0) {
        let taskLabelIds = [];
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(`/tasks/${task.id}/labels`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resp.ok) {
                const taskLabels = await resp.json();
                taskLabelIds = taskLabels.map(l => l.id);
            }
        } catch(e) { console.warn(e); }

        container.innerHTML = window.labels.map(label => `
            <div class="modal-label-item">
                <label style="background:${label.color}; padding:5px 12px; border-radius:20px; margin:4px; display:inline-block; color:white; cursor:pointer;">
                    <input type="checkbox" value="${label.id}" 
                        ${taskLabelIds.includes(label.id) ? 'checked' : ''}
                        onchange="toggleTaskLabel(${task.id}, ${label.id}, this.checked)">
                    ${label.name}
                </label>
            </div>
        `).join('');
    } else if (container) {
        container.innerHTML = '<div style="color:#999;">Загрузка меток...</div>';
    }

    document.getElementById('modal').style.display = 'flex';
}


function closeModal() {
    document.getElementById('modal').style.display = 'none';
    currentTask = null;
}

function openCreateModal() {
    document.getElementById('createTitle').value = '';
    document.getElementById('createDesc').value = '';
    document.getElementById('createPriority').value = 'medium';
    document.getElementById('createAssignedTo').value = '';
    document.getElementById('createColumnId').value = '1';
    document.getElementById('createModal').style.display = 'flex';
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
}

async function createTask() {
    const title = document.getElementById('createTitle').value.trim();
    if (!title) {
        showError('Введите название задачи');
        return;
    }
    
    try {
        await fetchAPI('/tasks', {
            method: 'POST',
            body: JSON.stringify({
                title: title,
                description: document.getElementById('createDesc').value,
                priority: document.getElementById('createPriority').value,
                column_id: parseInt(document.getElementById('createColumnId').value),
                assigned_to: parseInt(document.getElementById('createAssignedTo').value) || 0
            })
        });
        closeCreateModal();
        showSuccess('Задача создана');
        loadTasks();
    } catch (error) {
        console.error('Create error:', error);
    }
}

// // ========== МОДАЛЬНЫЕ ОКНА ==========
// function openModal(task) {
//     currentTask = task;
//     document.getElementById('editTitle').value = task.title || '';
//     document.getElementById('editDesc').value = task.description || '';
//     document.getElementById('editPriority').value = task.priority || 'medium';
//     document.getElementById('editAssignedTo').value = task.assigned_to || '';
//     document.getElementById('modal').style.display = 'flex';
// }

// function closeModal() {
//     document.getElementById('modal').style.display = 'none';
//     currentTask = null;
// }

// function openCreateModal() {
//     document.getElementById('createTitle').value = '';
//     document.getElementById('createDesc').value = '';
//     document.getElementById('createPriority').value = 'medium';
//     document.getElementById('createAssignedTo').value = '';
//     document.getElementById('createColumnId').value = '1';
//     document.getElementById('createModal').style.display = 'flex';
// }

// function closeCreateModal() {
//     document.getElementById('createModal').style.display = 'none';
// }

// async function createTask() {
//     const title = document.getElementById('createTitle').value.trim();
//     if (!title) {
//         showError('Введите название задачи');
//         return;
//     }
    
//     try {
//         await fetchAPI('/tasks', {
//             method: 'POST',
//             body: JSON.stringify({
//                 title: title,
//                 description: document.getElementById('createDesc').value,
//                 priority: document.getElementById('createPriority').value,
//                 column_id: parseInt(document.getElementById('createColumnId').value),
//                 assigned_to: parseInt(document.getElementById('createAssignedTo').value) || 0
//             })
//         });
//         closeCreateModal();
//         showSuccess('Задача создана');
//         loadTasks();
//     } catch (error) {
//         console.error('Create error:', error);
//     }
// }

async function saveTask() {
    if (!currentTask) return;
    
    try {
        await fetchAPI(`/tasks/${currentTask.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                title: document.getElementById('editTitle').value,
                description: document.getElementById('editDesc').value,
                priority: document.getElementById('editPriority').value,
                assigned_to: parseInt(document.getElementById('editAssignedTo').value) || 0
            })
        });
        closeModal();
        showSuccess('Задача сохранена');
        loadTasks();
    } catch (error) {
        console.error('Save error:', error);
    }
}

async function archiveCurrentTask() {
    if (!currentTask) return;
    if (!confirm('Переместить задачу в архив?')) return;
    
    try {
        await fetchAPI(`/tasks/${currentTask.id}/archive`, { method: 'PATCH' });
        closeModal();
        showSuccess('Задача перемещена в архив');
        loadTasks();
    } catch (error) {
        console.error('Archive error:', error);
    }
}

// ========== ТЁМНАЯ ТЕМА ==========
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.remove('dark');
    document.body.classList.add('light');
} else {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
}

const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        document.body.classList.toggle('light');
        localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadBoards();
    loadTasks();
    setupSearchListener();
    
    // Закрытие модальных окон по клику вне их
    document.getElementById('modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal')) closeModal();
    });
    document.getElementById('createModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('createModal')) closeCreateModal();
    });
});




// ========== ДОСКИ ==========
let currentBoardId = localStorage.getItem('currentBoardId') || 1;

async function loadBoards() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const response = await fetch('/boards', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const boards = await response.json();
            renderBoardsList(boards);
        }
    } catch (error) {
        console.error('Error loading boards:', error);
    }
}

function renderBoardsList(boards) {
    const boardList = document.getElementById('board-list');
    if (!boardList) return;
    boardList.innerHTML = boards.map(board => `
        <div class="board-item" data-id="${board.id}" onclick="switchBoard(${board.id})">
            <strong>${escapeHtml(board.title)}</strong>
        </div>
    `).join('');
}

async function switchBoard(boardId) {
    currentBoardId = boardId;
    localStorage.setItem('currentBoardId', boardId);
    await loadTasks();
}

async function createBoard(title, description = '') {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const response = await fetch('/boards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, description })
        });
        if (response.ok) {
            await loadBoards();
            return await response.json();
        }
    } catch (error) {
        console.error('Error creating board:', error);
    }
}

function showCreateBoardModal() {
    const title = prompt('Введите название доски:');
    if (title) createBoard(title);
}

// Загружаем доски при старте
if (typeof checkAuth === 'function') {
    loadBoards();
}

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadUsersForFilter();
  loadTasks();
  setupSearchListener();
});










