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
let allTasks = []; // Хранилище всех задач доски для быстрой работы

// Получение ID доски из URL. Если его там нет, берем сохраненный из localStorage
const urlParams = new URLSearchParams(window.location.search);
currentBoardId = urlParams.get('id') || localStorage.getItem('currentBoardId');

// --- РАБОТА С МЕТКАМИ ---

// Загрузка меток для текущей доски
async function loadLabels() {
    const token = localStorage.getItem('token');
    if (!token || !currentBoardId) return;
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

// Отображение списка меток в боковой/верхней панели
function renderLabelsList() {
    const container = document.getElementById('labelsList');
    if (!container) return;
    if (!labels || labels.length === 0) {
        container.innerHTML = '<div>Нет меток. Создайте первую!</div>';
        return;
    }
    container.innerHTML = labels.map(label => `
        <span class="label" style="background: ${label.color}; color: white; padding: 2px 8px; border-radius: 4px; margin-right: 5px; display: inline-block;">
            ${escapeHtml(label.name)}
        </span>
    `).join('');
}

// Рендеринг кнопок-фильтров по меткам
function renderLabelFilters() {
    const container = document.getElementById('labelFilters');
    if (!container) return;
    if (!labels || labels.length === 0) {
        container.innerHTML = '<div>Создайте метки для фильтрации</div>';
        return;
    }
    container.innerHTML = labels.map(label => `
        <span class="label-filter ${selectedLabelFilters.includes(label.id) ? 'active' : ''}" 
              style="background: ${label.color}; color: white; padding: 4px 10px; border-radius: 12px; margin-right: 5px; cursor: pointer; display: inline-block; opacity: ${selectedLabelFilters.includes(label.id) ? '1' : '0.6'};"
              onclick="toggleLabelFilter(${label.id})">${escapeHtml(label.name)}</span>
    `).join('');
}

// Переключение фильтра по клику на метку
function toggleLabelFilter(labelId) {
    if (selectedLabelFilters.includes(labelId)) {
        selectedLabelFilters = selectedLabelFilters.filter(id => id !== labelId);
    } else {
        selectedLabelFilters.push(labelId);
    }
    renderLabelFilters();
    loadBoardTasks(); // Перезагружаем задачи с учетом нового фильтра
}

// Сброс фильтрации по меткам
function clearLabelFilter() {
    selectedLabelFilters = [];
    renderLabelFilters();
    loadBoardTasks();
}

// Создание новой метки для проекта
async function createLabel() {
    const nameInput = document.getElementById('newLabelName');
    const colorInput = document.getElementById('newLabelColor');
    if (!nameInput || !nameInput.value.trim()) return;

    const name = nameInput.value.trim();
    const color = colorInput ? colorInput.value : '#3b82f6';
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_BASE_URL}/labels`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, color, board_id: parseInt(currentBoardId) })
        });
        if (response.ok) {
            nameInput.value = '';
            loadLabels();
        }
    } catch (error) {
        console.error('Error creating label:', error);
    }
}

// --- РАБОТА С ДОСКОЙ И КОЛОНКАМИ ---

// Основная инициализация страницы доски
async function loadBoard() {
    if (!currentBoardId) {
        alert("Проект не выбран. Возврат на главную.");
        window.location.href = 'index.html';
        return;
    }
    
    // Сохраняем текущий ID в память, чтобы другие вкладки знали, в каком мы проекте
    localStorage.setItem('currentBoardId', currentBoardId);

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Получаем информацию о самой доске (заголовок)
        const boardRes = await fetch(`${API_BASE_URL}/boards/${currentBoardId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (boardRes.ok) {
            const board = await boardRes.json();
            const titleElem = document.getElementById('boardTitle');
            if (titleElem) titleElem.innerHTML = board.title || 'Доска';
        }
        
        await loadLabels();
        await loadBoardTasks();
    } catch (error) {
        console.error('Error loading board:', error);
    }
}

// Загрузка структуры колонок
async function loadBoardTasks() {
    const token = localStorage.getItem('token');
    if (!token) return;
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

// Отрисовка колонок и карточек задач внутри них
async function renderColumns(columns) {
    const container = document.getElementById('columnsContainer');
    const token = localStorage.getItem('token');
    if (!container) return;

    if (!columns || columns.length === 0) {
        container.innerHTML = '<div class="empty-column">Нет колонок. Нажмите "+ Добавить колонку"</div>';
        return;
    }
    container.innerHTML = '';
    
    // Очищаем локальный список перед заполнением
    allTasks = [];
    
    for (const column of columns) {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'column';
        columnDiv.dataset.columnId = column.id;
        
        let tasks = [];
        try {
            // Важно: передаем board_id бэкенду, чтобы он знал, откуда брать задачи
            const tasksResponse = await fetch(`${API_BASE_URL}/tasks?column_id=${column.id}&board_id=${currentBoardId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (tasksResponse.ok) {
                const data = await tasksResponse.json();
                tasks = data.data || data;
                if (!Array.isArray(tasks)) tasks = [];
                
                // Сохраняем задачи в глобальный массив для быстрого перетаскивания без лишних GET-запросов
                allTasks.push(...tasks.map(t => ({ ...t, column_id: column.id })));
            }
        } catch (error) {
            console.error('Ошибка загрузки задач для колонки:', error);
        }
        
        columnDiv.innerHTML = `
            <div class="column-header">
                <span class="column-title">${escapeHtml(column.title)}</span>
                <button onclick="deleteColumn(${column.id})" style="background:none; border:none; cursor:pointer; color:#ef4444;"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="task-list" data-column-id="${column.id}" style="min-height: 100px;">
                ${tasks.map(task => `
                    <div class="task-card" data-task-id="${task.id}" style="cursor: grab;">
                        <div class="task-title"><strong>${escapeHtml(task.title)}</strong></div>
                        <span class="task-priority priority-${task.priority}" style="font-size: 11px;">
                            ${task.priority === 'high' ? '🔴 Высокий' : task.priority === 'medium' ? '🟡 Средний' : '🟢 Низкий'}
                        </span>
                    </div>
                `).join('')}
            </div>
            <button class="add-task-btn" onclick="showAddTaskModal(${column.id})"><i class="fa-solid fa-plus"></i> Добавить задачу</button>
        `;
        container.appendChild(columnDiv);
        
        // Включение Drag-and-Drop с помощью SortableJS
        const taskList = columnDiv.querySelector('.task-list');
        if (taskList && typeof Sortable !== 'undefined') {
            new Sortable(taskList, {
                group: 'tasks',
                animation: 250,
                fallbackOnBody: true,
                swapThreshold: 0.65,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd: async (evt) => {
                    const taskId = evt.item.dataset.taskId;
                    const newColumnId = evt.to.dataset.columnId;
                    // Вызываем сохранение только если карточку реально перенесли в другую колонку
                    if (taskId && newColumnId && evt.from !== evt.to) {
                        await updateTaskPosition(taskId, newColumnId);
                    }
                }
            });
        }
    }

    // Безопасный клик по карточке задачи (открытие модалки редактирования)
    container.onclick = (e) => {
        const taskCard = e.target.closest('.task-card');
        if (!taskCard) return; 
        if (taskCard.classList.contains('sortable-chosen')) return; 
        
        const taskId = taskCard.dataset.taskId;
        if (taskId) editTask(taskId);
    };
}

// --- СИНХРОНИЗАЦИЯ С СЕРВЕРОМ ПРИ ПЕРЕТАСКИВАНИИ ---

// ОПТИМИЗИРОВАННАЯ ФУНКЦИЯ СОХРАНЕНИЯ ПОЗИЦИИ КАРТОЧКИ (БЕЗ ЛИШНЕГО GET)
async function updateTaskPosition(taskId, newColumnId) {
    const token = localStorage.getItem('token');
    
    // 1. Ищем старые данные задачи в локальном массиве allTasks
    const currentTask = allTasks.find(t => t.id == taskId);
    if (!currentTask) {
        console.error('Задача не найдена локально');
        loadBoardTasks();
        return;
    }

    // 2. Формируем тело запроса, ОБЯЗАТЕЛЬНО включая board_id и правильные типы данных
    const updatedTaskData = {
        title: currentTask.title,
        description: currentTask.description || '',
        priority: currentTask.priority || 'medium',
        column_id: parseInt(newColumnId),
        board_id: parseInt(currentBoardId),
        assigned_to: currentTask.assigned_to ? parseInt(currentTask.assigned_to) : 0
    };

    try {
        const updateResponse = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedTaskData)
        });

        if (!updateResponse.ok) {
            console.error('Бэкенд отказался сохранить новую колонку. Статус:', updateResponse.status);
            loadBoardTasks(); // Откатываем интерфейс к состоянию базы данных в случае сбоя
        } else {
            // Локально обновляем колонку у задачи, чтобы данные оставались актуальными
            currentTask.column_id = parseInt(newColumnId);
        }
    } catch (error) {
        console.error('Ошибка сети при сохранении перемещения карточки:', error);
        loadBoardTasks();
    }
}

// --- УПРАВЛЕНИЕ КОЛОНКАМИ ---

// Создание новой колонки на доске
async function createColumn() {
    const titleInput = document.getElementById('columnTitle');
    if (!titleInput || !titleInput.value.trim()) return;

    const title = titleInput.value.trim();
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
            if (typeof closeColumnModal === 'function') closeColumnModal();
            titleInput.value = '';
            loadBoardTasks();
        }
    } catch (error) {
        console.error('Error creating column:', error);
    }
}

// Вспомогательная функция для открытия задачи (если логика модалки в другом файле, эта функция послужит мостом)
function editTask(taskId) {
    console.log("Открываем задачу на редактирование. ID задачи:", taskId);
    if (typeof openModal === 'function') {
        const targetTask = allTasks.find(t => t.id == taskId);
        if (targetTask) openModal(targetTask);
    } else {
        console.warn("Функция openModal() не найдена на странице. Проверьте подключение скриптов модальных окон.");
    }
}

// Безопасное экранирование спецсимволов для защиты от XSS атак
function escapeHtml(str) { 
    if (!str) return ''; 
    return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]||m)); 
}

// Запуск приложения при загрузке DOM-структуры страницы
document.addEventListener('DOMContentLoaded', () => {
    loadBoard();
});
// // frontend/board.js
// const API_BASE_URL = 'http://localhost:8081';
// let currentBoardId = null;
// let currentTaskId = null;
// let currentColumnId = null;
// let currentPage = 1;
// let perPage = 10;
// let searchQuery = '';
// let selectedLabelFilters = [];
// let labels = [];
// let allTasks = [];

// // Получение ID доски из URL
// const urlParams = new URLSearchParams(window.location.search);
// currentBoardId = urlParams.get('id');

// // Загрузка меток
// async function loadLabels() {
//     const token = localStorage.getItem('token');
//     if (!token) return;
//     try {
//         const response = await fetch(`${API_BASE_URL}/labels?board_id=${currentBoardId}`, {
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         if (response.ok) {
//             labels = await response.json();
//             renderLabelsList();
//             renderLabelFilters();
//         }
//     } catch (error) {
//         console.error('Error loading labels:', error);
//     }
// }

// function renderLabelsList() {
//     const container = document.getElementById('labelsList');
//     if (!container) return;
//     if (!labels || labels.length === 0) {
//         container.innerHTML = '<div>Нет меток. Создайте первую!</div>';
//         return;
//     }
//     container.innerHTML = labels.map(label => `
//         <span class="label" style="background: ${label.color};">${escapeHtml(label.name)}</span>
//     `).join('');
// }

// function renderLabelFilters() {
//     const container = document.getElementById('labelFilters');
//     if (!container) return;
//     if (!labels || labels.length === 0) {
//         container.innerHTML = '<div>Создайте метки для фильтрации</div>';
//         return;
//     }
//     container.innerHTML = labels.map(label => `
//         <span class="label-filter ${selectedLabelFilters.includes(label.id) ? 'active' : ''}" 
//               style="background: ${label.color};"
//               onclick="toggleLabelFilter(${label.id})">${escapeHtml(label.name)}</span>
//     `).join('');
// }

// function toggleLabelFilter(labelId) {
//     if (selectedLabelFilters.includes(labelId)) {
//         selectedLabelFilters = selectedLabelFilters.filter(id => id !== labelId);
//     } else {
//         selectedLabelFilters.push(labelId);
//     }
//     renderLabelFilters();
//     loadBoardTasks();
// }

// function clearLabelFilter() {
//     selectedLabelFilters = [];
//     renderLabelFilters();
//     loadBoardTasks();
// }

// async function createLabel() {
//     const name = document.getElementById('newLabelName').value.trim();
//     const color = document.getElementById('newLabelColor').value;
//     if (!name) return;
//     const token = localStorage.getItem('token');
//     try {
//         const response = await fetch(`${API_BASE_URL}/labels`, {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ name, color, board_id: currentBoardId })
//         });
//         if (response.ok) {
//             document.getElementById('newLabelName').value = '';
//             loadLabels();
//         }
//     } catch (error) {
//         console.error('Error creating label:', error);
//     }
// }

// // Загрузка доски
// async function loadBoard() {
//     if (!currentBoardId) {
//         window.location.href = 'index.html';
//         return;
//     }
//     const token = localStorage.getItem('token');
//     if (!token) {
//         window.location.href = 'login.html';
//         return;
//     }
//     try {
//         const boardRes = await fetch(`${API_BASE_URL}/boards/${currentBoardId}`, {
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         if (boardRes.ok) {
//             const board = await boardRes.json();
//             document.getElementById('boardTitle').innerHTML = board.title || 'Доска';
//         }
//         await loadBoardTasks();
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }

// async function loadBoardTasks() {
//     const token = localStorage.getItem('token');
//     try {
//         const columnsResponse = await fetch(`${API_BASE_URL}/columns?board_id=${currentBoardId}`, {
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         if (columnsResponse.ok) {
//             const columns = await columnsResponse.json();
//             await renderColumns(columns);
//         }
//     } catch (error) {
//         console.error('Error loading tasks:', error);
//     }
// }

// async function renderColumns(columns) {
//     const container = document.getElementById('columnsContainer');
//     const token = localStorage.getItem('token');
//     if (!columns || columns.length === 0) {
//         container.innerHTML = '<div class="empty-column">Нет колонок. Нажмите "+ Добавить колонку"</div>';
//         return;
//     }
//     container.innerHTML = '';
    
//     for (const column of columns) {
//         const columnDiv = document.createElement('div');
//         columnDiv.className = 'column';
//         columnDiv.dataset.columnId = column.id;
//         let tasks = [];
//         try {
//             const tasksResponse = await fetch(`${API_BASE_URL}/tasks?column_id=${column.id}`, {
//                 headers: { 'Authorization': `Bearer ${token}` }
//             });
//             if (tasksResponse.ok) {
//                 const data = await tasksResponse.json();
//                 tasks = data.data || data;
//                 if (!Array.isArray(tasks)) tasks = [];
//             }
//         } catch (error) {
//             console.error('Ошибка загрузки задач:', error);
//         }
        
//         columnDiv.innerHTML = `
//             <div class="column-header">
//                 <span class="column-title">${escapeHtml(column.title)}</span>
//                 <button onclick="deleteColumn(${column.id})" style="background:none; border:none; cursor:pointer; color:#ef4444;"><i class="fa-solid fa-trash"></i></button>
//             </div>
//             <div class="task-list" data-column-id="${column.id}">
//                 ${tasks.map(task => `
//                     <div class="task-card" data-task-id="${task.id}">
//                         <div class="task-title">${escapeHtml(task.title)}</div>
//                         <span class="task-priority priority-${task.priority}">${task.priority === 'high' ? '🔴 Высокий' : task.priority === 'medium' ? '🟡 Средний' : '🟢 Низкий'}</span>
//                     </div>
//                 `).join('')}
//             </div>
//             <button class="add-task-btn" onclick="showAddTaskModal(${column.id})"><i class="fa-solid fa-plus"></i> Добавить задачу</button>
//         `;
//         container.appendChild(columnDiv);
        
//         // Настройка Sortable для перетаскивания зажатием мышки
//         const taskList = columnDiv.querySelector('.task-list');
//         if (taskList && typeof Sortable !== 'undefined') {
//             new Sortable(taskList, {
//                 group: 'tasks',
//                 animation: 250,
//                 fallbackOnBody: true,
//                 swapThreshold: 0.65,
//                 ghostClass: 'sortable-ghost',
//                 chosenClass: 'sortable-chosen',
//                 dragClass: 'sortable-drag',
//                 delay: 0,
//                 onEnd: async (evt) => {
//                     const taskId = evt.item.dataset.taskId;
//                     const newColumnId = evt.to.dataset.columnId;
//                     if (taskId && newColumnId) {
//                         await updateTaskPosition(taskId, newColumnId);
//                     }
//                 }
//             });
//         }
//     }

//     // Защищенный клик по карточке (не падает, если кликнуть в пустоту)
//     container.addEventListener('click', (e) => {
//         const taskCard = e.target.closest('.task-card');
//         if (!taskCard) return; 
//         if (taskCard.classList.contains('sortable-chosen')) return; 
        
//         const taskId = taskCard.dataset.taskId;
//         if (taskId) editTask(taskId);
//     });
// }

// async function updateTaskPosition(taskId, newColumnId) {
//     const token = localStorage.getItem('token');
//     try {
//         const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
        
//         if (!response.ok) {
//             console.error('Не удалось получить данные задачи перед перемещением');
//             loadBoardTasks();
//             return;
//         }
        
//         const currentTask = await response.json();

//         const updatedTaskData = {
//             title: currentTask.title,
//             description: currentTask.description || '',
//             priority: currentTask.priority || 'medium',
//             column_id: parseInt(newColumnId)
//         };

//         const updateResponse = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
//             method: 'PUT',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(updatedTaskData)
//         });

//         if (!updateResponse.ok) {
//             console.error('Бэкенд вернул ошибку при обновлении позиции задачи');
//         }
        
//         loadBoardTasks();
//     } catch (error) {
//         console.error('Error:', error);
//         loadBoardTasks();
//     }
// }

// async function createColumn() {
//     const title = document.getElementById('columnTitle').value.trim();
//     if (!title) return;
//     const token = localStorage.getItem('token');
//     try {
//         const response = await fetch(`${API_BASE_URL}/columns`, {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ board_id: parseInt(currentBoardId), title: title })
//         });
//         if (response.ok) {
//             closeColumnModal();
//             loadBoardTasks();
//         }
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }