const API_URL = 'http://localhost:8080';

function getToken() {
    const token = localStorage.getItem('token');
    return token ? token.trim() : null;
}

// Функция для получения чистого ID доски из URL в любой момент времени
function getCleanBoardId() {
    const urlParams = new URLSearchParams(window.location.search);
    const rawId = urlParams.get('id');
    if (!rawId) return null;
    
    // Удаляем всё кроме цифр
    const cleanId = parseInt(rawId.replace(/[^0-9]/g, ''), 10);
    return isNaN(cleanId) ? null : cleanId;
}

let searchQuery = "";
let searchTimeout = null;

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
        window.location.href = "index.html";
        return;
    }

    const currentBoardId = getCleanBoardId();

    if (!currentBoardId) {
        document.getElementById('columns-container').innerHTML = 
            `<p style="color: red; padding: 20px; font-weight: bold;">⚠️ Ошибка: ID доски отсутствует в URL или некорректен (укажите, например, ?id=23)</p>`;
        return;
    }

    try {
        // Отправляем строго через board_id
        const colRes = await fetch(`${API_URL}/columns?board_id=${currentBoardId}`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });

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
        
        if (!Array.isArray(columns)) {
            console.error('Колонки не являются массивом:', columns);
            document.getElementById('columns-container').innerHTML = `<p style="color: red;">Ошибка: неверный формат данных колонок</p>`;
            return;
        }
        
        renderBoard(columns);
        document.getElementById('board-title').innerText = "Доска #" + currentBoardId;

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
            const taskRes = await fetch(`${API_URL}/tasks?column_id=${column.id}&search=${encodeURIComponent(searchQuery)}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });

            if (!taskRes.ok) throw new Error("Ошибка загрузки задач");

            let responseData = await taskRes.json();
            
            let columnTasks = responseData;
            if (responseData && responseData.data && Array.isArray(responseData.data)) {
                columnTasks = responseData.data;
            } else if (!Array.isArray(columnTasks)) {
                columnTasks = [];
            }

            columnDiv.innerHTML = `
                <h3>${escapeHtml(column.title)}</h3>
                <div class="task-list" data-column-id="${column.id}">
                    ${columnTasks.map(task => `
                        <div class="task-card" data-id="${task.id}" onclick="showTaskDetails(${task.id})">
                            <strong>${escapeHtml(task.title)}</strong>
                            ${task.priority ? `<span class="priority priority-${task.priority}">${task.priority}</span>` : ''}
                            ${task.deadline ? `<small>📅 ${new Date(task.deadline).toLocaleDateString()}</small>` : ''}
                        </div>
                    `).join('')}
                </div>
                <button onclick="addTask(${column.id})" class="btn-small">+ Задача</button>
            `;
            
            container.appendChild(columnDiv);

            const listElement = columnDiv.querySelector('.task-list');
            if (listElement && typeof Sortable !== 'undefined') {
                new Sortable(listElement, {
                    group: 'tasks',
                    animation: 150,
                    onEnd: async (evt) => {
                        const taskId = evt.item.dataset.id;
                        const newColumnId = evt.to.dataset.columnId;
                        if (taskId && newColumnId) {
                            await updateTaskPosition(taskId, newColumnId);
                        }
                    }
                });
            }

        } catch (taskError) {
            columnDiv.innerHTML = `<h3>${escapeHtml(column.title)}</h3><p style="color:orange;">⚠️ Ошибка задач</p>`;
            container.appendChild(columnDiv);
        }
    }

    if (typeof Sortable !== 'undefined') {
        new Sortable(container, {
            group: 'columns',
            animation: 150,
            handle: 'h3'
        });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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
                column_id: parseInt(newColumnId, 10)
            })
        });
        if (!res.ok) {
            throw new Error("Не удалось сохранить перемещение");
        }
        loadBoardData();
    } catch (e) {
        alert("Ошибка перемещения: " + e.message);
    }
}

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
                column_id: parseInt(columnId, 10),
                priority: "medium",
                description: ""
            })
        });

        if (!response.ok) throw new Error("Ошибка при создании задачи");
        loadBoardData();
    } catch (e) {
        alert("Ошибка: " + e.message);
    }
};

const addColBtn = document.getElementById('add-col-btn');
if (addColBtn) {
    addColBtn.onclick = async () => {
        const title = prompt("Название колонки:");
        if (!title) return;

        const currentBoardId = getCleanBoardId();
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
                    board_id: currentBoardId 
                })
            });

            if (!response.ok) throw new Error("Ошибка при создании колонки");
            loadBoardData();
        } catch (e) {
            alert("Ошибка: " + e.message);
        }
    };
}

window.showTaskDetails = (taskId) => {
    alert("Детали задачи ID: " + taskId);
};

// Первый запуск при загрузке страницы
loadBoardData();