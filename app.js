const API_URL = 'http://localhost:8080';

// Функция для получения свежего токена из хранилища
function getToken() {
    const token = localStorage.getItem('token');
    return token ? token.trim() : null;
}

// --- 1. ПРОВЕРКА ПРИ ЗАГРУЗКЕ ---
// Если токена нет совсем, просим его один раз и сохраняем
if (!getToken()) {
    const userToken = prompt("Сессия истекла. Введите ваш API токен:");
    if (userToken) {
        localStorage.setItem('token', userToken.trim());
        // Перезагружаем страницу, чтобы применился новый токен
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

        // --- 2. УМНАЯ ОБРАБОТКА ОШИБОК ---
        if (response.status === 401) {
            // Если сервер сказал "401 Unauthorized", значит токен старый
            localStorage.removeItem('token'); // Удаляем плохой токен
            alert("Ваш токен больше не подходит. Введите актуальный.");
            window.location.reload(); // Перезапуск вызовет prompt выше
            return;
        }

        if (!response.ok) throw new Error('Ошибка при загрузке');

        const boards = await response.json();
        displayBoards(boards);
    } catch (error) {
        console.error("Проблема:", error);
        // Вместо простого alert меняем текст в сетке, чтобы не мешать пользователю
        const grid = document.getElementById('boards-grid');
        if (grid) {
            grid.innerHTML = `<p style="color: red; padding: 20px;">⚠️ Не удалось подключиться к серверу. Убедитесь, что Go запущен на порту 8080.</p>`;
        }
    }
}

function displayBoards(boards) {
    const grid = document.getElementById('boards-grid');
    if (!grid) return;
    grid.innerHTML = ''; 

    if (boards.length === 0) {
        grid.innerHTML = "<p>У вас пока нет досок. Создайте первую!</p>";
        return;
    }

    boards.forEach(board => {
        const card = document.createElement('div');
        card.className = 'board-card';
        card.innerHTML = `
            <h3>${board.title}</h3>
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
            window.location.reload();
            return;
        }

        if (response.ok) {
            loadBoards(); 
        } else {
            alert("Не удалось создать доску");
        }
    } catch (e) {
        alert("Ошибка сети");
    }
});

loadBoards();