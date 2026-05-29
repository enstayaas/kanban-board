// frontend/script.js

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentTask = null;
let isLoading = false;
let currentPage = 1;
let perPage = 10;
let currentSortBy = 'priority';
let currentSortOrder = 'desc';
let allTasks = [];
let allColumns = []; // 🔥 Новая глобальная переменная для хранения кастомных колонок из базы
let searchQuery = '';
let currentBoardId = localStorage.getItem('currentBoardId') || 1;

// Глобальная ссылка на функции из labels.js (если они используются)
if (typeof getTaskLabels !== 'undefined') window.getTaskLabels = getTaskLabels;
if (typeof toggleTaskLabel !== 'undefined') window.toggleTaskLabel = toggleTaskLabel;

const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// ... (Функции уведомлений, Debounce и fetchAPI остаются без изменений) ...

// ========== ЗАГРУЗКА И ОТРИСОВКА ЗАДАЧ ==========
async function loadTasks() {
    if (isLoading) return;
    isLoading = true;
    
    const boardDiv = document.getElementById('board');
    if (boardDiv) {
        boardDiv.innerHTML = '<div style="text-align:center; padding:40px;">Загрузка задач...</div>';
    }
    
    try {
        // 1. Сначала скачиваем кастомные колонки для текущей доски из БД
        try {
            const columnsData = await fetchAPI(`/columns?board_id=${currentBoardId}`);
            allColumns = Array.isArray(columnsData) ? columnsData : [];
        } catch (colError) {
            console.error('Ошибка при загрузке кастомных колонок:', colError);
            allColumns = []; // В случае ошибки работаем только на системных
        }

        // 2. Формируем полный список ID колонок, для которых нужно запросить задачи
        // Системные [1, 2, 3] + ID из базы данных
        const systemIds = [1, 2, 3];
        const customIds = allColumns.map(c => parseInt(c.id)).filter(id => !systemIds.includes(id));
        const totalColumnsToFetch = [...systemIds, ...customIds];
        
        let loadedTasks = [];
        
        // 3. Собираем задачи по ВСЕМ активным колонкам
        for (const columnId of totalColumnsToFetch) {
            const data = await fetchAPI(`/tasks?board_id=${currentBoardId}&column_id=${columnId}&page=${currentPage}&limit=${perPage}&sort=${currentSortBy}&order=${currentSortOrder}`);
            
            if (data && data.data) {
                loadedTasks.push(...data.data);
            } else if (Array.isArray(data)) {
                loadedTasks.push(...data);
            }
        }
        
        allTasks = loadedTasks;
        await renderBoard(allTasks);
        
    } catch (error) {
        console.error('Load tasks error:', error);
        if (boardDiv) {
            boardDiv.innerHTML = '<div class="empty-state">⚠️ Не удалось загрузить задачи</div>';
        }
    } finally {
        isLoading = false;
    }
}

async function renderBoard(tasks) {
    const boardDiv = document.getElementById('board');
    if (!boardDiv) return;
    
    // Безопасное получение меток, если функция существует
    const tasksWithLabels = await Promise.all(tasks.map(async (task) => {
        if (typeof getTaskLabelsForDisplay === 'function') {
            const taskLabels = await getTaskLabelsForDisplay(task.id);
            return { ...task, labels: taskLabels };
        }
        return { ...task, labels: [] };
    }));
    
    boardDiv.innerHTML = '';
    
    // СИСТЕМНЫЕ КОЛОНКИ (базовые)
    const systemColumns = [
        { id: 1, title: 'К выполнению', icon: '<i class="fa-regular fa-rectangle-list"></i>' },
        { id: 2, title: 'В процессе', icon: '<i class="fa-solid fa-gear"></i>' },
        { id: 3, title: 'Выполнено', icon: '<i class="fa-regular fa-circle-check"></i>' }
    ];
    
    const customColumns = typeof allColumns !== 'undefined' ? allColumns : [];
    
    // Объединяем системные и кастомные колонки, исключая дубликаты ID
    const columns = [
        ...systemColumns,
        ...customColumns.filter(c => c && ![1, 2, 3].includes(parseInt(c.id)))
    ];
    
    const priorityEmojis = { 'high': '🔴', 'medium': '🟡', 'low': '🟢' };
    
    columns.forEach(col => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'column';
        
        const columnId = parseInt(col.id);
        const rawTitle = col.title || `Колонка ${columnId}`;
        
        const displayTitle = col.icon ? `${col.icon} ${rawTitle}` : escapeHtml(rawTitle);
        
        // ПРОВЕРКА НА УДАЛЕНИЕ: кнопка не появится у ID 1, 2, 3
        const isSystemColumn = [1, 2, 3].includes(columnId);
        let deleteButtonHtml = '';
        
        if (!isSystemColumn) {
            deleteButtonHtml = `
                <button class="delete-col-btn" onclick="deleteColumnSoft(${columnId}, '${escapeHtml(rawTitle)}')" 
                        style="background: none; border: none; color: #ff4d4d; cursor: pointer; padding: 5px; font-size: 14px;"
                        title="Архивировать колонку">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
        }
        
        columnDiv.innerHTML = `
            <div class="column-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">${displayTitle}</h3>
                ${deleteButtonHtml}
            </div>
        `;
        
        const tasksInColumn = tasksWithLabels.filter(t => t.column_id === columnId);
        
        if (tasksInColumn.length === 0) {
            const emptyStateDiv = document.createElement('div');
            emptyStateDiv.className = 'empty-state';
            emptyStateDiv.innerText = '✨ Нет задач';
            columnDiv.appendChild(emptyStateDiv);
        } else {
            tasksInColumn.forEach(task => {
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task';
                
                const labelsHtml = task.labels && task.labels.length > 0 
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
// ========== УПРАВЛЕНИЕ ДОСКАМИ (ПРОЕКТАМИ) ==========
async function loadBoards() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const data = await fetchAPI('/boards');
        
        // ВЫВОДИМ В КОНСОЛЬ: Посмотри, что тут напишет браузер!
        console.log("=== ОТВЕТ СЕРВЕРА ПО /boards ===", data);
        
        // Если данные вообще не пришли
        if (!data) {
            showError("Сервер вернул пустой ответ");
            return;
        }

        let boardsArray = [];
        if (data && Array.isArray(data.data)) {
            boardsArray = data.data;
        } else if (Array.isArray(data)) {
            boardsArray = data;
        } else if (data && data.boards && Array.isArray(data.boards)) {
            boardsArray = data.boards;
        } else {
            // Если это не массив, выведем ошибку на экран, превратив объект в строку
            showError("Формат ответа не массив! См. консоль (F12)");
            console.error("Ожидался массив досок, но пришло это:", JSON.stringify(data));
            return;
        }
        
        const activeBoards = boardsArray.filter(board => board && board.is_archived !== true);
        renderBoardsList(activeBoards);
    } catch (error) {
        console.error('Error loading boards:', error);
    }
}
function renderBoardsList(boards) {
    const boardList = document.getElementById('board-list');
    if (!boardList) return;
    if (!boards || boards.length === 0) {
        boardList.innerHTML = '<div>Нет активных досок</div>';
        return;
    }
    
    boardList.innerHTML = boards.map(board => `
        <div class="board-item ${board.id == currentBoardId ? 'active' : ''}" data-id="${board.id}" style="position: relative; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 10px; border-radius: 6px;">
            <div onclick="switchBoard(${board.id})" style="cursor: pointer; flex-grow: 1;">
                <strong>${escapeHtml(board.title)}</strong>
                <div style="font-size: 12px; color: #888;">${escapeHtml(board.description || 'Нет описания')}</div>
            </div>
            <button onclick="moveBoardToTrash(${board.id}, '${escapeHtml(board.title)}', '${escapeHtml(board.description || '')}')" 
                    style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px 8px; font-size: 16px;">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `).join('');
}

async function moveBoardToTrash(id, title, description) {
    if (!confirm(`⚠️ Переместить проект "${title}" в корзину? Вы сможете восстановить его из Архива.`)) return;

    try {
        await fetchAPI(`/boards/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                title: title,
                description: description,
                is_archived: true
            })
        });
        
        showSuccess('Проект перемещен в корзину');
        
        if (currentBoardId == id) {
            localStorage.setItem('currentBoardId', 1);
            currentBoardId = 1;
        }
        
        await loadBoards();
        await loadTasks();
    } catch (error) {
        console.error('Error archiving board:', error);
        showError('Не удалось переместить в корзину');
    }
}

async function switchBoard(boardId) {
    currentBoardId = boardId;
    localStorage.setItem('currentBoardId', boardId);
    currentPage = 1;
    await loadTasks();
    await loadBoards(); // Перерисовываем, чтобы обновить класс active
}

async function createBoard(title, description = '') {
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

// ========== МОДАЛЬНЫЕ ОКНА ЗАДАЧ ==========
async function openModal(task) {
    currentTask = task;
    document.getElementById('editTitle').value = task.title || '';
    document.getElementById('editDesc').value = task.description || '';
    document.getElementById('editPriority').value = task.priority || 'medium';
    document.getElementById('editAssignedTo').value = task.assigned_to || '';

    // Отрисовка меток (если массив оконных меток существует)
    const container = document.getElementById('modalTaskLabels');
    if (container && window.labels && window.labels.length > 0) {
        let taskLabelIds = [];
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(`${API_BASE_URL}/tasks/${task.id}/labels`, {
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
        container.innerHTML = '<div style="color:#999;">Нет доступных меток</div>';
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

// Дополнительные функции сохранения изменений
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
                assigned_to: parseInt(document.getElementById('createAssignedTo').value) || 0,
                board_id: parseInt(currentBoardId) // Привязываем задачу к текущей доске
            })
        });
        closeCreateModal();
        showSuccess('Задача создана');
        loadTasks();
    } catch (error) {
        console.error('Create error:', error);
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ДАННЫЕ ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => {
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

// ========== ТЁМНАЯ ТЕМА ==========
const savedTheme = localStorage.getItem('theme') || 'dark';
document.body.classList.toggle('light', savedTheme === 'light');
document.body.classList.toggle('dark', savedTheme === 'dark');

const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        document.body.classList.toggle('light');
        localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    });
}

// ========== ЕДИНАЯ ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadBoards();
    loadTasks();
    setupSearchListener();
    
    document.getElementById('modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal')) closeModal();
    });
    document.getElementById('createModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('createModal')) closeCreateModal();
    });
});
// Функция отправки новой колонки в базу данных
async function createColumn() {
    const titleInput = document.getElementById('colTitle');
    const title = titleInput ? titleInput.value.trim() : '';

    if (!title) {
        showError('❌ Введите название колонки');
        return;
    }

    try {
        await fetchAPI('/columns', {
            method: 'POST',
            body: JSON.stringify({
                board_id: parseInt(currentBoardId),
                title: title
            })
        });

        if (titleInput) titleInput.value = '';
        closeCreateColumnModal(); // Эта функция закрывает твою HTML модалку
        showSuccess('✅ Колонка добавлена');
        await loadTasks(); // Мгновенно обновляем доску с новой колонкой
    } catch (error) {
        console.error('Ошибка добавления колонки:', error);
    }
}

// Функция мягкого удаления (вызывается из корзины на заголовке)
async function deleteColumnSoft(columnId, columnTitle) {
    if ([1, 2, 3].includes(parseInt(columnId))) {
        showError('🔒 Системные колонки нельзя удалить!');
        return;
    }

    if (!confirm(`Вы уверены, что хотите переместить колонку "${columnTitle}" в архив?`)) {
        return;
    }

    try {
        // Твой бэкенд (метод DeleteColumn) слушает DELETE /columns/{id}
        await fetchAPI(`/columns/${columnId}`, {
            method: 'DELETE'
        });
        
        showSuccess('🗑️ Колонка перемещена в архив');
        await loadTasks(); // Обновляем доску, колонка исчезнет!
    } catch (error) {
        console.error('Ошибка удаления колонки:', error);
    }
}
// ========== МОДАЛКА СОЗДАНИЯ КОЛОНКИ ==========
function openCreateColumnModal() {
    const modal = document.getElementById('createColumnModal');
    if (modal) modal.style.display = 'flex';
}

function closeCreateColumnModal() {
    const modal = document.getElementById('createColumnModal');
    const input = document.getElementById('colTitle');
    if (modal) modal.style.display = 'none';
    if (input) input.value = ''; // Очищаем поле при закрытии
}