const API_URL = 'http://localhost:8081';

// Функция для получения свежего токена из хранилища
function getToken() {
    const token = localStorage.getItem('token');
    return token ? token.trim() : null;
}

// --- 1. ПРОВЕРКА ПРИ ЗАГРУЗКЕ ---
if (!getToken()) {
    const userToken = prompt("Сессия истекла. Введите ваш API токен:");
    if (userToken) {
        localStorage.setItem('token', userToken.trim());
        window.location.reload();
    }
}

async function loadBoards() {
    const TOKEN = getToken();
    if (!TOKEN) return;

    try {
        const response = await fetch(`${API_URL}/boards`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            alert("Ваш токен больше не подходит. Введите актуальный.");
            window.location.reload();
            return;
        }

        if (!response.ok) throw new Error('Ошибка при загрузке');

        const data = await response.json();
        
        // Поддержка пагинации: если ответ содержит поле data, берём его, иначе считаем что data - это массив
        let boards = data;
        if (data && data.data && Array.isArray(data.data)) {
            boards = data.data;
        } else if (!Array.isArray(boards)) {
            console.error('Неверный формат данных:', data);
            boards = [];
        }
        
        displayBoards(boards);
    } catch (error) {
        console.error("Проблема:", error);
        const grid = document.getElementById('boards-grid');
        if (grid) {
            grid.innerHTML = `<p style="color: red; padding: 20px;">⚠️ Не удалось подключиться к серверу. Убедитесь, что Go запущен на порту 8081.</p>`;
        }
    }
}

function displayBoards(boards) {
    const grid = document.getElementById('boards-grid');
    if (!grid) return;
    grid.innerHTML = ''; 

    if (!boards || boards.length === 0) {
        grid.innerHTML = "<p>У вас пока нет досок. Создайте первую!</p>";
        return;
    }

    boards.forEach(board => {
        const card = document.createElement('div');
        card.className = 'board-card';
        card.innerHTML = `
            <h3>${board.title || 'Без названия'}</h3>
            <p>${board.description || 'Описания нет'}</p>
        `;
        card.onclick = () => {
            window.location.href = `board.html?id=${board.id}`;
        };
        grid.appendChild(card);
    });
}

document.getElementById('add-board-btn').addEventListener('click', async () => {
    const title = prompt("Введите название нового проекта:");
    if (!title) return;

    const TOKEN = getToken();
    if (!TOKEN) {
        alert("Нет токена. Обновите страницу.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/boards`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: title, description: "Создано через интерфейс" })
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            alert("Сессия истекла. Обновите страницу.");
            window.location.reload();
            return;
        }

        if (response.ok) {
            loadBoards(); 
        } else {
            const error = await response.json();
            alert("Не удалось создать доску: " + (error.error || "Неизвестная ошибка"));
        }
    } catch (e) {
        console.error("Ошибка:", e);
        alert("Ошибка сети. Убедитесь, что сервер запущен на порту 8080.");
    }
});

loadBoards();