const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

let currentStats = { done: 0, inProgress: 0, todo: 0, total: 0 };
let currentPercent = { done: 0, inProgress: 0, todo: 0 };

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`);
        const tasks = await response.json();
        
        currentStats.total = tasks.length;
        currentStats.done = tasks.filter(t => t.column_id === 3).length;
        currentStats.inProgress = tasks.filter(t => t.column_id === 2).length;
        currentStats.todo = tasks.filter(t => t.column_id === 1).length;
        
        currentPercent.done = currentStats.total === 0 ? 0 : Math.round((currentStats.done / currentStats.total) * 100);
        currentPercent.inProgress = currentStats.total === 0 ? 0 : Math.round((currentStats.inProgress / currentStats.total) * 100);
        currentPercent.todo = currentStats.total === 0 ? 0 : Math.round((currentStats.todo / currentStats.total) * 100);
        
        updateDonutChart();
        updateStatsCards();
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

function updateDonutChart() {
    const donutChart = document.getElementById('donutChart');
    if (!donutChart) return;
    
    const { done, inProgress, todo } = currentPercent;
    
    donutChart.style.background = `conic-gradient(
        #8b5cf6 0% ${done}%,
        #3b82f6 ${done}% ${done + inProgress}%,
        #64748b ${done + inProgress}% 100%
    )`;
    
    // Обновляем центр круга (по умолчанию выполнено)
    updateCenter('done');
}

function updateStatsCards() {
    const doneCountEl = document.getElementById('doneCount');
    const progressCountEl = document.getElementById('progressCount');
    const todoCountEl = document.getElementById('todoCount');
    const totalCountEl = document.getElementById('totalCount');
    const centerPercent = document.getElementById('centerPercent');
    const centerLabel = document.getElementById('centerLabel');
    
    if (doneCountEl) doneCountEl.innerText = currentStats.done;
    if (progressCountEl) progressCountEl.innerText = currentStats.inProgress;
    if (todoCountEl) todoCountEl.innerText = currentStats.todo;
    if (totalCountEl) totalCountEl.innerText = currentStats.total;
    if (centerPercent) centerPercent.innerText = `${currentPercent.done}%`;
    if (centerLabel) centerLabel.innerText = 'выполнено';
}

function updateCenter(type) {
    const centerPercent = document.getElementById('centerPercent');
    const centerLabel = document.getElementById('centerLabel');
    
    if (type === 'done') {
        centerPercent.innerText = `${currentPercent.done}%`;
        centerLabel.innerText = 'выполнено';
    } else if (type === 'inProgress') {
        centerPercent.innerText = `${currentPercent.inProgress}%`;
        centerLabel.innerText = 'в процессе';
    } else if (type === 'todo') {
        centerPercent.innerText = `${currentPercent.todo}%`;
        centerLabel.innerText = 'не начато';
    }
}

// ===== ИНТЕРАКТИВНЫЙ КРУГ =====
function setupInteractiveDonut() {
    const donutChart = document.getElementById('donutChart');
    if (!donutChart) return;
    
    // При наведении на сектора (через родительский контейнер)
    donutChart.addEventListener('mousemove', (e) => {
        const rect = donutChart.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // Вычисляем угол от центра до мыши
        let angle = Math.atan2(mouseY - centerY, mouseX - centerX) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        
        // Определяем сектор по углу
        const { done, inProgress } = currentPercent;
        const doneAngle = done * 3.6;
        const inProgressAngle = doneAngle + (inProgress * 3.6);
        
        if (angle <= doneAngle) {
            donutChart.style.filter = 'drop-shadow(0 0 8px #8b5cf6)';
            updateCenter('done');
        } else if (angle <= inProgressAngle) {
            donutChart.style.filter = 'drop-shadow(0 0 8px #3b82f6)';
            updateCenter('inProgress');
        } else {
            donutChart.style.filter = 'drop-shadow(0 0 8px #64748b)';
            updateCenter('todo');
        }
    });
    
    donutChart.addEventListener('mouseleave', () => {
        donutChart.style.filter = 'none';
        updateCenter('done');
    });
}

// ===== ПЕРЕКЛЮЧЕНИЕ ТЕМЫ =====
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme');

if (savedTheme === 'light') {
    document.body.classList.remove('dark');
    document.body.classList.add('light');
    if (themeToggle) themeToggle.textContent = '🌙 Тёмная тема';
} else {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
    if (themeToggle) themeToggle.textContent = '☀️ Светлая тема';
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('dark')) {
            document.body.classList.remove('dark');
            document.body.classList.add('light');
            localStorage.setItem('theme', 'light');
            themeToggle.textContent = '🌙 Тёмная тема';
        } else {
            document.body.classList.remove('light');
            document.body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            themeToggle.textContent = '☀️ Светлая тема';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    setupInteractiveDonut();
});








// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

// async function loadStats() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/tasks`);
//         const tasks = await response.json();
        
//         const total = tasks.length;
//         const done = tasks.filter(t => t.column_id === 3).length;
//         const inProgress = tasks.filter(t => t.column_id === 2).length;
//         const todo = tasks.filter(t => t.column_id === 1).length;
        
//         const donePercent = total === 0 ? 0 : Math.round((done / total) * 100);
//         const inProgressPercent = total === 0 ? 0 : Math.round((inProgress / total) * 100);
//         const todoPercent = total === 0 ? 0 : Math.round((todo / total) * 100);
        
//         // Обновляем круговую диаграмму (НОВЫЕ ЦВЕТА)
//         const donutChart = document.getElementById('donutChart');
//         if (donutChart) {
//             donutChart.style.background = `conic-gradient(
//                 #8b5cf6 0% ${donePercent}%,
//                 #3b82f6 ${donePercent}% ${donePercent + inProgressPercent}%,
//                 #64748b ${donePercent + inProgressPercent}% 100%
//             )`;
//         }
        
//         // Центральный процент
//         const centerPercent = document.getElementById('centerPercent');
//         if (centerPercent) centerPercent.innerText = `${donePercent}%`;
        
//         // ОБНОВЛЯЕМ КАРТОЧКИ СЛЕВА (в новом дизайне)
//         const doneCountEl = document.getElementById('doneCount');
//         const progressCountEl = document.getElementById('progressCount');
//         const todoCountEl = document.getElementById('todoCount');
//         const totalCountEl = document.getElementById('totalCount');
        
//         if (doneCountEl) doneCountEl.innerText = done;
//         if (progressCountEl) progressCountEl.innerText = inProgress;
//         if (todoCountEl) todoCountEl.innerText = todo;
//         if (totalCountEl) totalCountEl.innerText = total;
        
//     } catch (error) {
//         console.error('Ошибка загрузки статистики:', error);
//     }
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

// document.addEventListener('DOMContentLoaded', loadStats);











// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

// async function loadStats() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/tasks`);
//         const tasks = await response.json();
        
//         const total = tasks.length;
//         const done = tasks.filter(t => t.column_id === 3).length;
//         const inProgress = tasks.filter(t => t.column_id === 2).length;
//         const todo = tasks.filter(t => t.column_id === 1).length;
        
//         const donePercent = total === 0 ? 0 : Math.round((done / total) * 100);
//         const inProgressPercent = total === 0 ? 0 : Math.round((inProgress / total) * 100);
//         const todoPercent = total === 0 ? 0 : Math.round((todo / total) * 100);
        
//         // Обновляем круговую диаграмму
//         const donutChart = document.getElementById('donutChart');
//         if (donutChart) {
//             donutChart.style.background = `conic-gradient(
//                 #10b981 0% ${donePercent}%,
//                 #f59e0b ${donePercent}% ${donePercent + inProgressPercent}%,
//                 #ef4444 ${donePercent + inProgressPercent}% 100%
//             )`;
//         }
        
//         // Центральный процент
//         document.getElementById('centerPercent').innerText = `${donePercent}%`;
        
//         // Легенда
//         const legend = document.getElementById('legend');
//         legend.innerHTML = `
//             <div class="legend-item">
//                 <div class="legend-left">
//                     <div class="legend-color" style="background: #10b981;"></div>
//                     <span class="legend-label">✅ Выполнено</span>
//                 </div>
//                 <div>
//                     <span class="legend-value">${done}</span>
//                     <span class="legend-percent">(${donePercent}%)</span>
//                 </div>
//             </div>
//             <div class="legend-item">
//                 <div class="legend-left">
//                     <div class="legend-color" style="background: #f59e0b;"></div>
//                     <span class="legend-label">⚙️ В процессе</span>
//                 </div>
//                 <div>
//                     <span class="legend-value">${inProgress}</span>
//                     <span class="legend-percent">(${inProgressPercent}%)</span>
//                 </div>
//             </div>
//             <div class="legend-item">
//                 <div class="legend-left">
//                     <div class="legend-color" style="background: #ef4444;"></div>
//                     <span class="legend-label">📋 Не начато</span>
//                 </div>
//                 <div>
//                     <span class="legend-value">${todo}</span>
//                     <span class="legend-percent">(${todoPercent}%)</span>
//                 </div>
//             </div>
//         `;
        
//         // Общая статистика
//         document.getElementById('totalNumber').innerText = total;
        
//     } catch (error) {
//         console.error('Ошибка загрузки статистики:', error);
//         document.getElementById('legend').innerHTML = '<div style="text-align:center; color:red;">Ошибка загрузки данных</div>';
//         document.getElementById('totalNumber').innerText = '0';
//     }
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

// document.addEventListener('DOMContentLoaded', loadStats);








// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

// async function loadStats() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/tasks`);
//         const tasks = await response.json();
        
//         const total = tasks.length;
//         const done = tasks.filter(t => t.column_id === 3).length; // Done
//         const inProgress = tasks.filter(t => t.column_id === 2).length; // In Progress
//         const todo = tasks.filter(t => t.column_id === 1).length; // To Do
        
//         const donePercent = total === 0 ? 0 : Math.round((done / total) * 100);
//         const inProgressPercent = total === 0 ? 0 : Math.round((inProgress / total) * 100);
//         const todoPercent = total === 0 ? 0 : Math.round((todo / total) * 100);
        
//         // Обновляем круговую диаграмму (conic-gradient)
//         const donutChart = document.getElementById('donutChart');
//         if (donutChart) {
//             donutChart.style.background = `conic-gradient(
//                 #4caf50 0% ${donePercent}%,
//                 #ff9800 ${donePercent}% ${donePercent + inProgressPercent}%,
//                 #f44336 ${donePercent + inProgressPercent}% 100%
//             )`;
//         }
        
//         // Легенда
//         const legend = document.getElementById('legend');
//         legend.innerHTML = `
//             <div class="legend-item"><div class="legend-color" style="background:#4caf50;"></div>✅ Сделано: ${done} задач (${donePercent}%)</div>
//             <div class="legend-item"><div class="legend-color" style="background:#ff9800;"></div>⚙️ В процессе: ${inProgress} задач (${inProgressPercent}%)</div>
//             <div class="legend-item"><div class="legend-color" style="background:#f44336;"></div>📋 Не начато: ${todo} задач (${todoPercent}%)</div>
//         `;
        
//         // Цифры
//         const numbers = document.getElementById('numbers');
//         numbers.innerHTML = `📊 Всего задач: ${total}`;
        
//     } catch (error) {
//         console.error('Ошибка загрузки статистики:', error);
//         document.getElementById('legend').innerHTML = '<div>Ошибка загрузки данных</div>';
//     }
// }

// document.addEventListener('DOMContentLoaded', loadStats);
