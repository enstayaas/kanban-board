// frontend/stats.js
const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// Получение токена
function getToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }
    return token;
}

// Получение текущей доски (из localStorage)
function getCurrentBoardId() {
    return localStorage.getItem('currentBoardId') || null;
}

// Получение всех задач текущей доски
async function fetchBoardTasks() {
    const token = getToken();
    const boardId = getCurrentBoardId();
    if (!token || !boardId) return [];

    try {
        // Получаем колонки доски
        const columnsResponse = await fetch(`${API_BASE_URL}/columns?board_id=${boardId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!columnsResponse.ok) return [];
        
        const columns = await columnsResponse.json();
        if (!Array.isArray(columns)) return [];
        
        let allTasks = [];
        
        for (const column of columns) {
            const tasksResponse = await fetch(`${API_BASE_URL}/tasks?column_id=${column.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (tasksResponse.ok) {
                const data = await tasksResponse.json();
                const tasks = data.data || data;
                if (Array.isArray(tasks)) {
                    allTasks = allTasks.concat(tasks.map(task => ({
                        ...task,
                        column_title: column.title
                    })));
                }
            }
        }
        
        return allTasks;
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }
}

// Подсчёт статистики
function calculateStats(tasks) {
    const todoCount = tasks.filter(t => 
        t.column_title === 'To Do' || 
        t.column_title === '📋 К выполнению' ||
        t.column_title === 'Todo'
    ).length;
    
    const progressCount = tasks.filter(t => 
        t.column_title === 'In Progress' || 
        t.column_title === '⚙️ В процессе' ||
        t.column_title === 'Progress'
    ).length;
    
    const doneCount = tasks.filter(t => 
        t.column_title === 'Done' || 
        t.column_title === '✅ Выполнено'
    ).length;
    
    const total = tasks.length;
    
    return {
        todo: todoCount,
        progress: progressCount,
        done: doneCount,
        total: total,
        completionRate: total > 0 ? Math.round((doneCount / total) * 100) : 0
    };
}

// Обновление круговой диаграммы
function updateDonutChart(stats) {
    const donutElement = document.getElementById('donutChart');
    const centerPercent = document.getElementById('centerPercent');
    const centerLabel = document.getElementById('centerLabel');
    
    if (!donutElement) return;
    
    if (stats.total === 0) {
        donutElement.style.background = 'conic-gradient(#e5e7eb 0% 100%)';
        if (centerPercent) centerPercent.textContent = '0%';
        return;
    }
    
    const todoPercent = (stats.todo / stats.total) * 100;
    const progressPercent = (stats.progress / stats.total) * 100;
    const donePercent = (stats.done / stats.total) * 100;
    
    let gradient = `conic-gradient(`;
    let hasPrevious = false;
    
    if (stats.todo > 0) {
        gradient += `#3b82f6 0% ${todoPercent}%`;
        hasPrevious = true;
    }
    if (stats.progress > 0) {
        if (hasPrevious) gradient += `, `;
        gradient += `#f59e0b ${todoPercent}% ${todoPercent + progressPercent}%`;
        hasPrevious = true;
    }
    if (stats.done > 0) {
        if (hasPrevious) gradient += `, `;
        gradient += `#10b981 ${todoPercent + progressPercent}% 100%`;
    }
    gradient += `)`;
    
    donutElement.style.background = gradient;
    
    if (centerPercent) centerPercent.textContent = `${stats.completionRate}%`;
    if (centerLabel) centerLabel.textContent = 'выполнено';
}

// Обновление статистики на странице
function updateStatsDisplay(stats) {
    const doneEl = document.getElementById('doneCount');
    const progressEl = document.getElementById('progressCount');
    const todoEl = document.getElementById('todoCount');
    const totalEl = document.getElementById('totalCount');
    
    if (doneEl) doneEl.textContent = stats.done;
    if (progressEl) progressEl.textContent = stats.progress;
    if (todoEl) todoEl.textContent = stats.todo;
    if (totalEl) totalEl.textContent = stats.total;
}

// Загрузка и отображение статистики
async function loadStats() {
    const token = getToken();
    if (!token) return;
    
    const boardId = getCurrentBoardId();
    let tasks = [];
    
    if (boardId) {
        tasks = await fetchBoardTasks();
    } else {
        // Если нет выбранной доски, показываем заглушку
        const totalEl = document.getElementById('totalCount');
        if (totalEl) totalEl.textContent = '0';
        const stats = { todo: 0, progress: 0, done: 0, total: 0, completionRate: 0 };
        updateStatsDisplay(stats);
        updateDonutChart(stats);
        return;
    }
    
    const stats = calculateStats(tasks);
    updateStatsDisplay(stats);
    updateDonutChart(stats);
    
    console.log('Статистика загружена:', stats);
}

// Тёмная тема
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme');

if (savedTheme === 'light') {
    document.body.classList.remove('dark');
    document.body.classList.add('light');
    if (themeToggle) themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i> Тёмная';
} else {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
    if (themeToggle) themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i> Светлая';
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        document.body.classList.toggle('light');
        const isDark = document.body.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i> Светлая' : '<i class="fa-solid fa-moon"></i> Тёмная';
    });
}

// Запуск
document.addEventListener('DOMContentLoaded', loadStats);

// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// let currentStats = { done: 0, inProgress: 0, todo: 0, total: 0 };
// let currentPercent = { done: 0, inProgress: 0, todo: 0 };

// async function loadStats() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/tasks`);
//         const tasks = await response.json();
        
//         currentStats.total = tasks.length;
//         currentStats.done = tasks.filter(t => t.column_id === 3).length;
//         currentStats.inProgress = tasks.filter(t => t.column_id === 2).length;
//         currentStats.todo = tasks.filter(t => t.column_id === 1).length;
        
//         currentPercent.done = currentStats.total === 0 ? 0 : Math.round((currentStats.done / currentStats.total) * 100);
//         currentPercent.inProgress = currentStats.total === 0 ? 0 : Math.round((currentStats.inProgress / currentStats.total) * 100);
//         currentPercent.todo = currentStats.total === 0 ? 0 : Math.round((currentStats.todo / currentStats.total) * 100);
        
//         updateDonutChart();
//         updateStatsCards();
        
//     } catch (error) {
//         console.error('Ошибка загрузки статистики:', error);
//     }
// }


// // function updateDonutChart() {
// //     const donutChart = document.getElementById('donutChart');
// //     if (!donutChart) return;
    
// //     const { done, inProgress, todo } = currentPercent;
    
// //     // ГРАДИЕНТНЫЕ ЦВЕТА для секторов
// //     const doneGradient = `conic-gradient(
// //         from 0deg, 
// //         #8b5cf6 0% ${done}%,
// //         #a78bfa ${done}% ${done}%
// //     )`;
    
// //     const inProgressGradient = `conic-gradient(
// //         from 0deg, 
// //         #3b82f6 0% ${inProgress}%,
// //         #60a5fa ${inProgress}% ${inProgress}%
// //     )`;
    
// //     const todoGradient = `conic-gradient(
// //         from 0deg, 
// //         #64748b 0% ${todo}%,
// //         #94a3b8 ${todo}% ${todo}%
// //     )`;
    
// //     donutChart.style.background = `conic-gradient(
// //     from 0deg,
// //     #d946ef 0% ${done}%,
// //     #f0abfc ${done}% ${done}%,
// //     #3b82f6 ${done}% ${done + inProgress}%,
// //     #60a5fa ${done + inProgress}% ${done + inProgress}%,
// //     #1e293b ${done + inProgress}% ${done + inProgress + todo}%,
// //     #334155 ${done + inProgress + todo}% 100%
// // )`;
//     // Комбинируем сектора с градиентами (через позиции)
// //     donutChart.style.background = `conic-gradient(
// //         from 0deg,
// //         #8b5cf6 0% ${done}%,
// //         #a78bfa ${done}% ${done}%,
// //         #3b82f6 ${done}% ${done + inProgress}%,
// //         #60a5fa ${done + inProgress}% ${done + inProgress}%,
// //         #64748b ${done + inProgress}% ${done + inProgress + todo}%,
// //         #94a3b8 ${done + inProgress + todo}% 100%
// //     )`;

// // ;
    
// //     // Обновляем центр
// //     updateCenter(currentCenterType);
// // }
// function updateDonutChart() {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     const { done, inProgress, todo } = currentPercent;
    
//     donutChart.style.background = `conic-gradient(
//         #8b5cf6 0% ${done}%,
//         #3b82f6 ${done}% ${done + inProgress}%,
//         #64748b ${done + inProgress}% 100%
//     )`;
    
//     // Обновляем центр круга (по умолчанию выполнено)
//     updateCenter('done');
// }

// function updateStatsCards() {
//     const doneCountEl = document.getElementById('doneCount');
//     const progressCountEl = document.getElementById('progressCount');
//     const todoCountEl = document.getElementById('todoCount');
//     const totalCountEl = document.getElementById('totalCount');
//     const centerPercent = document.getElementById('centerPercent');
//     const centerLabel = document.getElementById('centerLabel');
    
//     if (doneCountEl) doneCountEl.innerText = currentStats.done;
//     if (progressCountEl) progressCountEl.innerText = currentStats.inProgress;
//     if (todoCountEl) todoCountEl.innerText = currentStats.todo;
//     if (totalCountEl) totalCountEl.innerText = currentStats.total;
//     if (centerPercent) centerPercent.innerText = `${currentPercent.done}%`;
//     if (centerLabel) centerLabel.innerText = 'выполнено';
// }

// function updateCenter(type) {
//     const centerPercent = document.getElementById('centerPercent');
//     const centerLabel = document.getElementById('centerLabel');
    
//     if (type === 'done') {
//         centerPercent.innerText = `${currentPercent.done}%`;
//         centerLabel.innerText = 'выполнено';
//     } else if (type === 'inProgress') {
//         centerPercent.innerText = `${currentPercent.inProgress}%`;
//         centerLabel.innerText = 'в процессе';
//     } else if (type === 'todo') {
//         centerPercent.innerText = `${currentPercent.todo}%`;
//         centerLabel.innerText = 'не начато';
//     }
// }

// // ===== ИНТЕРАКТИВНЫЙ КРУГ =====
// function setupInteractiveDonut() {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     // При наведении на сектора (через родительский контейнер)
//     donutChart.addEventListener('mousemove', (e) => {
//         const rect = donutChart.getBoundingClientRect();
//         const centerX = rect.left + rect.width / 2;
//         const centerY = rect.top + rect.height / 2;
//         const mouseX = e.clientX;
//         const mouseY = e.clientY;
        
//         // Вычисляем угол от центра до мыши
//         let angle = Math.atan2(mouseY - centerY, mouseX - centerX) * 180 / Math.PI;
//         if (angle < 0) angle += 360;
        
//         // Определяем сектор по углу
//         const { done, inProgress } = currentPercent;
//         const doneAngle = done * 3.6;
//         const inProgressAngle = doneAngle + (inProgress * 3.6);
        
//         if (angle <= doneAngle) {
//             donutChart.style.filter = 'drop-shadow(0 0 8px #8b5cf6)';
//             updateCenter('done');
//         } else if (angle <= inProgressAngle) {
//             donutChart.style.filter = 'drop-shadow(0 0 8px #3b82f6)';
//             updateCenter('inProgress');
//         } else {
//             donutChart.style.filter = 'drop-shadow(0 0 8px #64748b)';
//             updateCenter('todo');
//         }
//     });
    
//     donutChart.addEventListener('mouseleave', () => {
//         donutChart.style.filter = 'none';
//         updateCenter('done');
//     });
// }

// // ===== ПЕРЕКЛЮЧЕНИЕ ТЕМЫ =====
// const themeToggle = document.getElementById('themeToggle');
// const savedTheme = localStorage.getItem('theme');

// if (savedTheme === 'light') {
//     document.body.classList.remove('dark');
//     document.body.classList.add('light');
//     if (themeToggle) themeToggle.textContent = '🌙 Тёмная тема';
// } else {
//     document.body.classList.add('dark');
//     document.body.classList.remove('light');
//     if (themeToggle) themeToggle.textContent = '☀️ Светлая тема';
// }

// if (themeToggle) {
//     themeToggle.addEventListener('click', () => {
//         if (document.body.classList.contains('dark')) {
//             document.body.classList.remove('dark');
//             document.body.classList.add('light');
//             localStorage.setItem('theme', 'light');
//             themeToggle.textContent = '🌙 Тёмная тема';
//         } else {
//             document.body.classList.remove('light');
//             document.body.classList.add('dark');
//             localStorage.setItem('theme', 'dark');
//             themeToggle.textContent = '☀️ Светлая тема';
//         }
//     });
// }

// document.addEventListener('DOMContentLoaded', () => {
//     loadStats();
//     setupInteractiveDonut();
// });








// // const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

// // async function loadStats() {
// //     try {
// //         const response = await fetch(`${API_BASE_URL}/tasks`);
// //         const tasks = await response.json();
        
// //         const total = tasks.length;
// //         const done = tasks.filter(t => t.column_id === 3).length;
// //         const inProgress = tasks.filter(t => t.column_id === 2).length;
// //         const todo = tasks.filter(t => t.column_id === 1).length;
        
// //         const donePercent = total === 0 ? 0 : Math.round((done / total) * 100);
// //         const inProgressPercent = total === 0 ? 0 : Math.round((inProgress / total) * 100);
// //         const todoPercent = total === 0 ? 0 : Math.round((todo / total) * 100);
        
// //         // Обновляем круговую диаграмму (НОВЫЕ ЦВЕТА)
// //         const donutChart = document.getElementById('donutChart');
// //         if (donutChart) {
// //             donutChart.style.background = `conic-gradient(
// //                 #8b5cf6 0% ${donePercent}%,
// //                 #3b82f6 ${donePercent}% ${donePercent + inProgressPercent}%,
// //                 #64748b ${donePercent + inProgressPercent}% 100%
// //             )`;
// //         }
        
// //         // Центральный процент
// //         const centerPercent = document.getElementById('centerPercent');
// //         if (centerPercent) centerPercent.innerText = `${donePercent}%`;
        
// //         // ОБНОВЛЯЕМ КАРТОЧКИ СЛЕВА (в новом дизайне)
// //         const doneCountEl = document.getElementById('doneCount');
// //         const progressCountEl = document.getElementById('progressCount');
// //         const todoCountEl = document.getElementById('todoCount');
// //         const totalCountEl = document.getElementById('totalCount');
        
// //         if (doneCountEl) doneCountEl.innerText = done;
// //         if (progressCountEl) progressCountEl.innerText = inProgress;
// //         if (todoCountEl) todoCountEl.innerText = todo;
// //         if (totalCountEl) totalCountEl.innerText = total;
        
// //     } catch (error) {
// //         console.error('Ошибка загрузки статистики:', error);
// //     }
// // }

// // // ===== ПЕРЕКЛЮЧЕНИЕ ТЕМЫ =====
// // const themeToggle = document.getElementById('themeToggle');
// // const savedTheme = localStorage.getItem('theme');

// // if (savedTheme === 'light') {
// //     document.body.classList.remove('dark');
// //     document.body.classList.add('light');
// //     if (themeToggle) themeToggle.textContent = '🌙 Тёмная тема';
// // } else {
// //     document.body.classList.add('dark');
// //     document.body.classList.remove('light');
// //     if (themeToggle) themeToggle.textContent = '☀️ Светлая тема';
// // }

// // if (themeToggle) {
// //     themeToggle.addEventListener('click', () => {
// //         if (document.body.classList.contains('dark')) {
// //             document.body.classList.remove('dark');
// //             document.body.classList.add('light');
// //             localStorage.setItem('theme', 'light');
// //             themeToggle.textContent = '🌙 Тёмная тема';
// //         } else {
// //             document.body.classList.remove('light');
// //             document.body.classList.add('dark');
// //             localStorage.setItem('theme', 'dark');
// //             themeToggle.textContent = '☀️ Светлая тема';
// //         }
// //     });
// // }

// // document.addEventListener('DOMContentLoaded', loadStats);











// // const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

// // async function loadStats() {
// //     try {
// //         const response = await fetch(`${API_BASE_URL}/tasks`);
// //         const tasks = await response.json();
        
// //         const total = tasks.length;
// //         const done = tasks.filter(t => t.column_id === 3).length;
// //         const inProgress = tasks.filter(t => t.column_id === 2).length;
// //         const todo = tasks.filter(t => t.column_id === 1).length;
        
// //         const donePercent = total === 0 ? 0 : Math.round((done / total) * 100);
// //         const inProgressPercent = total === 0 ? 0 : Math.round((inProgress / total) * 100);
// //         const todoPercent = total === 0 ? 0 : Math.round((todo / total) * 100);
        
// //         // Обновляем круговую диаграмму
// //         const donutChart = document.getElementById('donutChart');
// //         if (donutChart) {
// //             donutChart.style.background = `conic-gradient(
// //                 #10b981 0% ${donePercent}%,
// //                 #f59e0b ${donePercent}% ${donePercent + inProgressPercent}%,
// //                 #ef4444 ${donePercent + inProgressPercent}% 100%
// //             )`;
// //         }
        
// //         // Центральный процент
// //         document.getElementById('centerPercent').innerText = `${donePercent}%`;
        
// //         // Легенда
// //         const legend = document.getElementById('legend');
// //         legend.innerHTML = `
// //             <div class="legend-item">
// //                 <div class="legend-left">
// //                     <div class="legend-color" style="background: #10b981;"></div>
// //                     <span class="legend-label">✅ Выполнено</span>
// //                 </div>
// //                 <div>
// //                     <span class="legend-value">${done}</span>
// //                     <span class="legend-percent">(${donePercent}%)</span>
// //                 </div>
// //             </div>
// //             <div class="legend-item">
// //                 <div class="legend-left">
// //                     <div class="legend-color" style="background: #f59e0b;"></div>
// //                     <span class="legend-label">⚙️ В процессе</span>
// //                 </div>
// //                 <div>
// //                     <span class="legend-value">${inProgress}</span>
// //                     <span class="legend-percent">(${inProgressPercent}%)</span>
// //                 </div>
// //             </div>
// //             <div class="legend-item">
// //                 <div class="legend-left">
// //                     <div class="legend-color" style="background: #ef4444;"></div>
// //                     <span class="legend-label">📋 Не начато</span>
// //                 </div>
// //                 <div>
// //                     <span class="legend-value">${todo}</span>
// //                     <span class="legend-percent">(${todoPercent}%)</span>
// //                 </div>
// //             </div>
// //         `;
        
// //         // Общая статистика
// //         document.getElementById('totalNumber').innerText = total;
        
// //     } catch (error) {
// //         console.error('Ошибка загрузки статистики:', error);
// //         document.getElementById('legend').innerHTML = '<div style="text-align:center; color:red;">Ошибка загрузки данных</div>';
// //         document.getElementById('totalNumber').innerText = '0';
// //     }
// // }

// // // ===== ПЕРЕКЛЮЧЕНИЕ ТЕМЫ =====
// // const themeToggle = document.getElementById('themeToggle');
// // const savedTheme = localStorage.getItem('theme');

// // if (savedTheme === 'light') {
// //     document.body.classList.remove('dark');
// //     document.body.classList.add('light');
// //     if (themeToggle) themeToggle.textContent = '🌙 Тёмная тема';
// // } else {
// //     document.body.classList.add('dark');
// //     document.body.classList.remove('light');
// //     if (themeToggle) themeToggle.textContent = '☀️ Светлая тема';
// // }

// // if (themeToggle) {
// //     themeToggle.addEventListener('click', () => {
// //         if (document.body.classList.contains('dark')) {
// //             document.body.classList.remove('dark');
// //             document.body.classList.add('light');
// //             localStorage.setItem('theme', 'light');
// //             themeToggle.textContent = '🌙 Тёмная тема';
// //         } else {
// //             document.body.classList.remove('light');
// //             document.body.classList.add('dark');
// //             localStorage.setItem('theme', 'dark');
// //             themeToggle.textContent = '☀️ Светлая тема';
// //         }
// //     });
// // }

// // document.addEventListener('DOMContentLoaded', loadStats);








// // const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

// // async function loadStats() {
// //     try {
// //         const response = await fetch(`${API_BASE_URL}/tasks`);
// //         const tasks = await response.json();
        
// //         const total = tasks.length;
// //         const done = tasks.filter(t => t.column_id === 3).length; // Done
// //         const inProgress = tasks.filter(t => t.column_id === 2).length; // In Progress
// //         const todo = tasks.filter(t => t.column_id === 1).length; // To Do
        
// //         const donePercent = total === 0 ? 0 : Math.round((done / total) * 100);
// //         const inProgressPercent = total === 0 ? 0 : Math.round((inProgress / total) * 100);
// //         const todoPercent = total === 0 ? 0 : Math.round((todo / total) * 100);
        
// //         // Обновляем круговую диаграмму (conic-gradient)
// //         const donutChart = document.getElementById('donutChart');
// //         if (donutChart) {
// //             donutChart.style.background = `conic-gradient(
// //                 #4caf50 0% ${donePercent}%,
// //                 #ff9800 ${donePercent}% ${donePercent + inProgressPercent}%,
// //                 #f44336 ${donePercent + inProgressPercent}% 100%
// //             )`;
// //         }
        
// //         // Легенда
// //         const legend = document.getElementById('legend');
// //         legend.innerHTML = `
// //             <div class="legend-item"><div class="legend-color" style="background:#4caf50;"></div>✅ Сделано: ${done} задач (${donePercent}%)</div>
// //             <div class="legend-item"><div class="legend-color" style="background:#ff9800;"></div>⚙️ В процессе: ${inProgress} задач (${inProgressPercent}%)</div>
// //             <div class="legend-item"><div class="legend-color" style="background:#f44336;"></div>📋 Не начато: ${todo} задач (${todoPercent}%)</div>
// //         `;
        
// //         // Цифры
// //         const numbers = document.getElementById('numbers');
// //         numbers.innerHTML = `📊 Всего задач: ${total}`;
        
// //     } catch (error) {
// //         console.error('Ошибка загрузки статистики:', error);
// //         document.getElementById('legend').innerHTML = '<div>Ошибка загрузки данных</div>';
// //     }
// // }

// // document.addEventListener('DOMContentLoaded', loadStats);
