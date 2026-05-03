const API_URL = 'http://localhost:8080';

// Функция для безопасного получения токена (всегда актуальный)
function getToken() {
    const token = localStorage.getItem('token');
    return token ? token.trim() : null;
}

const urlParams = new URLSearchParams(window.location.search);
// Убираем двоеточия из ID, если они там есть
let boardId = urlParams.get('id') ? urlParams.get('id').replace(':', '') : null;

let searchQuery = ""; 
let searchTimeout = null; 

// --- 1. ПОИСК С ЗАДЕРЖКОЙ ---
const searchInput = document.getElementById('task-search');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchQuery = e.target.value;
        searchTimeout = setTimeout(() => {
            loadBoardData();
        }, 300);
    });
}

// Главная функция загрузки
async function loadBoardData() {
    const TOKEN = getToken();
    if (!TOKEN) {
        alert("Сессия истекла. Перейдите на главную страницу для входа.");
        window.location.href = "index.html"; // Возвращаем на список досок для ввода токена
        return;
    }

    try {
        const colRes = await fetch(`${API_URL}/columns?board_id=${boardId}`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });

        // Если токен не подошел (401)
        if (colRes.status === 401) {
            localStorage.removeItem('token');
            window.location.href = "index.html";
            return;
        }

        if (!colRes.ok) {
            const errorData = await colRes.json().catch(() => ({}));
            throw new Error(errorData.error || `Ошибка сервера: ${colRes.status}`);
        }

        const columns = await colRes.json();
        renderBoard(columns);
        document.getElementById('board-title').innerText = "Доска #" + boardId;

    } catch (e) {
        console.error("Ошибка:", e);
        document.getElementById('columns-container').innerHTML = 
            `<p style="color: red; padding: 20px; font-weight: bold;">⚠️ ${e.message}</p>`;
    }
}

async function renderBoard(columns) {
    const container = document.getElementById('columns-container');
    container.innerHTML = '';

    if (!columns || columns.length === 0) {
        container.innerHTML = "<p style='padding:20px;'>Колонок пока нет. Создайте первую!</p>";
        return;
    }

    const TOKEN = getToken();

    for (const column of columns) {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'column';
        
        try {
            // Защита от спецсимволов в поиске (encodeURIComponent)
            const taskRes = await fetch(`${API_URL}/tasks?column_id=${column.id}&search=${encodeURIComponent(searchQuery)}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });

            if (!taskRes.ok) throw new Error("Ошибка загрузки задач");

            let columnTasks = await taskRes.json();

            columnDiv.innerHTML = `
                <h3>${column.title}</h3>
                <div class="task-list" data-column-id="${column.id}">
                    ${columnTasks ? columnTasks.map(task => `
                        <div class="task-card" data-id="${task.id}">
                            <strong>${task.title}</strong>
                            ${task.description ? `<p style="font-size: 0.8em; color: #666;">${task.description}</p>` : ''}
                        </div>
                    `).join('') : ''}
                </div>
                <button onclick="addTask(${column.id})" class="btn-small">+ Задача</button>
            `;
            
            container.appendChild(columnDiv);

            // Drag & Drop задач
            const listElement = columnDiv.querySelector('.task-list');
            new Sortable(listElement, {
                group: 'tasks',
                animation: 150,
                onEnd: async (evt) => {
                    const taskId = evt.item.dataset.id;
                    const newColumnId = evt.to.dataset.columnId;
                    await updateTaskPosition(taskId, newColumnId);
                }
            });

        } catch (taskError) {
            columnDiv.innerHTML = `<h3>${column.title}</h3><p style="color:orange;">⚠️ Ошибка задач</p>`;
            container.appendChild(columnDiv);
        }
    }

    // Drag & Drop колонок
    new Sortable(container, {
        group: 'columns',
        animation: 150,
        handle: 'h3'
    });
}

// Обновление позиции/колонки задачи
async function updateTaskPosition(taskId, newColumnId) {
    const TOKEN = getToken();
    try {
        const res = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ 
                column_id: parseInt(newColumnId),
                title: "Перемещение", // Названия полей должны совпадать со структурой в Go
                position: 0 
            })
        });
        if (!res.ok) throw new Error("Не удалось сохранить перемещение");
    } catch (e) {
        console.error("Ошибка перемещения:", e.message);
    }
}

// Добавление задачи
window.addTask = async (columnId) => {
    const title = prompt("Что нужно сделать?");
    if (!title) return;

    const TOKEN = getToken();
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ 
                title: title, 
                column_id: parseInt(columnId),
                priority: "medium",
                description: ""
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.error || "Ошибка при создании");
        }

        loadBoardData();
    } catch (e) {
        alert("Ошибка: " + e.message);
    }
};

// Добавление колонки
const addColBtn = document.getElementById('add-col-btn');
if (addColBtn) {
    addColBtn.onclick = async () => {
        const title = prompt("Название колонки:");
        if (!title) return;

        const TOKEN = getToken();
        try {
            const response = await fetch(`${API_URL}/columns`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TOKEN}`
                },
                body: JSON.stringify({ 
                    title: title, 
                    board_id: parseInt(boardId) 
                })
            });

            if (!response.ok) throw new Error("Ошибка при создании колонки");
            loadBoardData();
        } catch (e) {
            alert("Ошибка: " + e.message);
        }
    };
}

// Запуск при открытии страницы
loadBoardData();