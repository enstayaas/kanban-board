const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Пытаемся взять board_id из адреса страницы
    const urlParams = new URLSearchParams(window.location.search);
    let boardId = urlParams.get('board_id');

    // Если в адресе нет id, берем из памяти сохраненный активный проект
    if (!boardId) {
        boardId = localStorage.getItem('currentBoardId') || '1';
        // Дописываем id в адресную строку без перезагрузки, чтобы красиво было
        window.history.replaceState(null, '', `stats.html?board_id=${boardId}`);
    }

    // Настраиваем кнопку "Доска" в меню, чтобы она возвращала в текущий проект
    const boardLink = document.querySelector('.nav a[href="board.html"], .nav a[href="index.html"]');
    if (boardLink) {
        boardLink.href = `board.html?id=${boardId}`; 
    }

    // 2. Делаем запрос к бэкенду
    try {
        // Запрашиваем ВСЕ задачи (или /tasks, смотря какой у вас эндпоинт)
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error("Ошибка загрузки");
        const allTasks = await response.json();

        // 🔥 КЛЮЧЕВОЙ МОМЕНТ: Оставляем задачи ТОЛЬКО для этой доски!
        const filteredTasks = allTasks.filter(task => task.board_id === parseInt(boardId));

        // Отправляем отфильтрованные задачи на расчет статистики
        updateStatsUI(filteredTasks);

    } catch (error) {
        console.error("Ошибка статистики:", error);
    }
});

// 3. Функция подсчета и отрисовки (исправленная)
function updateStatsUI(tasks) {
    // Если нужно исключить архивные, раскомментируйте строку ниже:
    // const activeTasks = tasks.filter(t => !t.is_archived);
    const activeTasks = tasks; 

    // Считаем по ID колонок (1 - To Do, 2 - In Progress, 3 - Done)
    const todo = activeTasks.filter(t => t.column_id === 1).length;
    const progress = activeTasks.filter(t => t.column_id === 2).length;
    const done = activeTasks.filter(t => t.column_id === 3).length;
    const total = activeTasks.length;

    // Обновляем циферки в карточках
    document.getElementById("todoCount").textContent = todo;
    document.getElementById("progressCount").textContent = progress;
    document.getElementById("doneCount").textContent = done;
    document.getElementById("totalCount").textContent = total;

    // Считаем процент выполнения правильно
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    document.getElementById("centerPercent").textContent = `${percent}%`;

    // Перерисовываем круг, чтобы проценты и цвета совпадали
    const donutChart = document.getElementById("donutChart");
    if (donutChart) {
        if (total > 0) {
            const donePercent = (done / total) * 100;
            const progressPercent = (progress / total) * 100;

            // Фиолетовый (To Do), Зеленый (Done), Темный (In Progress) — настройте под ваши цвета
            donutChart.style.background = `conic-gradient(
                #22c55e 0% ${donePercent}%, 
                #a855f7 ${donePercent}% ${donePercent + progressPercent}%, 
                #3b82f6 ${donePercent + progressPercent}% 100%
            )`;
        } else {
            donutChart.style.background = `#4b5563`; // Серый круг, если пустая доска
            document.getElementById("centerPercent").textContent = `0%`;
        }
    }
}