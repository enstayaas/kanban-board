// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// let currentStats = { done: 0, inProgress: 0, todo: 0, total: 0 };
// let currentPercent = { done: 0, inProgress: 0, todo: 0 };

// async function loadStats() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/stats`, {
//             headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
//         });
//         const stats = await response.json();
        
//         currentStats.done = stats.done || 0;
//         currentStats.inProgress = stats.inProgress || 0;
//         currentStats.todo = stats.todo || 0;
//         currentStats.total = stats.total || 0;
        
//         currentPercent.done = currentStats.total === 0 ? 0 : Math.round((currentStats.done / currentStats.total) * 100);
//         currentPercent.inProgress = currentStats.total === 0 ? 0 : Math.round((currentStats.inProgress / currentStats.total) * 100);
//         currentPercent.todo = currentStats.total === 0 ? 0 : Math.round((currentStats.todo / currentStats.total) * 100);
        
//         updateStatsCards();
//         updateDonutChart();
//         setupInteractiveDonut();
        
//     } catch (error) {
//         console.error('Ошибка загрузки статистики:', error);
//     }
// }

// function updateStatsCards() {
//     document.getElementById('doneCount').innerText = currentStats.done;
//     document.getElementById('progressCount').innerText = currentStats.inProgress;
//     document.getElementById('todoCount').innerText = currentStats.todo;
//     document.getElementById('totalCount').innerText = currentStats.total;
// }

// function updateDonutChart(highlightSegment = null) {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     const done = currentPercent.done;
//     const inProgress = currentPercent.inProgress;
//     const todo = currentPercent.todo;
    
//     // КРАСИВЫЕ ГРАДИЕНТНЫЕ ЦВЕТА
//     const doneGrad = 'linear-gradient(135deg, #10b981, #34d399)';
//     const inProgressGrad = 'linear-gradient(135deg, #3b82f6, #60a5fa)';
//     const todoGrad = 'linear-gradient(135deg, #8b5cf6, #a78bfa)';
    
//     // Базовые цвета для conic-gradient
//     let doneColor, inProgressColor, todoColor;
    
//     if (highlightSegment === 'done') {
//         doneColor = '#34d399';
//         inProgressColor = '#4b5563';
//         todoColor = '#4b5563';
//     } else if (highlightSegment === 'inProgress') {
//         doneColor = '#4b5563';
//         inProgressColor = '#60a5fa';
//         todoColor = '#4b5563';
//     } else if (highlightSegment === 'todo') {
//         doneColor = '#4b5563';
//         inProgressColor = '#4b5563';
//         todoColor = '#a78bfa';
//     } else {
//         doneColor = '#10b981';
//         inProgressColor = '#3b82f6';
//         todoColor = '#8b5cf6';
//     }
    
//     donutChart.style.background = `conic-gradient(
//         from 0deg,
//         ${doneColor} 0% ${done}%,
//         ${inProgressColor} ${done}% ${done + inProgress}%,
//         ${todoColor} ${done + inProgress}% 100%
//     )`;
    
//     // Эффект свечения при наведении
//     if (highlightSegment) {
//         donutChart.style.transform = 'scale(1.02)';
//         donutChart.style.filter = `drop-shadow(0 0 12px ${doneColor === '#34d399' ? '#10b981' : inProgressColor === '#60a5fa' ? '#3b82f6' : '#8b5cf6'})`;
//     } else {
//         donutChart.style.transform = 'scale(1)';
//         donutChart.style.filter = 'none';
//     }
// }

// function setupInteractiveDonut() {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     const container = donutChart.parentElement;
    
//     function getAngleFromEvent(e) {
//         const rect = donutChart.getBoundingClientRect();
//         const centerX = rect.left + rect.width / 2;
//         const centerY = rect.top + rect.height / 2;
//         const x = e.clientX - centerX;
//         const y = e.clientY - centerY;
//         let angle = Math.atan2(y, x) * 180 / Math.PI;
//         if (angle < 0) angle += 360;
//         return angle;
//     }
    
//     function getSegment(angle) {
//         const doneAngle = currentPercent.done * 3.6;
//         const inProgressAngle = doneAngle + (currentPercent.inProgress * 3.6);
        
//         if (angle <= doneAngle) return 'done';
//         if (angle <= inProgressAngle) return 'inProgress';
//         return 'todo';
//     }
    
//     function updateCenter(segment) {
//         const centerPercent = document.getElementById('centerPercent');
//         const centerLabel = document.getElementById('centerLabel');
        
//         let percent = 0, label = '';
//         if (segment === 'done') {
//             percent = currentPercent.done;
//             label = 'выполнено';
//         } else if (segment === 'inProgress') {
//             percent = currentPercent.inProgress;
//             label = 'в процессе';
//         } else {
//             percent = currentPercent.todo;
//             label = 'не начато';
//         }
        
//         centerPercent.innerText = `${percent}%`;
//         centerLabel.innerText = label;
//     }
    
//     container.addEventListener('mousemove', (e) => {
//         const angle = getAngleFromEvent(e);
//         const segment = getSegment(angle);
//         updateCenter(segment);
//         updateDonutChart(segment);
//     });
    
//     container.addEventListener('mouseleave', () => {
//         updateCenter('done');
//         updateDonutChart(null);
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

// document.addEventListener('DOMContentLoaded', loadStats);










// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// let currentStats = { done: 0, inProgress: 0, todo: 0, total: 0 };
// let activeSegment = 'done';

// async function loadStats() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/stats`, {
//             headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
//         });
//         const stats = await response.json();
        
//         currentStats.done = stats.done || 0;
//         currentStats.inProgress = stats.inProgress || 0;
//         currentStats.todo = stats.todo || 0;
//         currentStats.total = stats.total || 0;
        
//         updateCards();
//         drawDonut();
//         setupEvents();
        
//     } catch (error) {
//         console.error('Error loading stats:', error);
//     }
// }

// function updateCards() {
//     document.getElementById('doneCount').innerText = currentStats.done;
//     document.getElementById('progressCount').innerText = currentStats.inProgress;
//     document.getElementById('todoCount').innerText = currentStats.todo;
//     document.getElementById('totalCount').innerText = currentStats.total;
// }

// function drawDonut() {
//     const chart = document.getElementById('donutChart');
//     if (!chart) return;
    
//     const total = currentStats.total;
//     if (total === 0) {
//         chart.style.background = '#e5e7eb';
//         document.getElementById('centerPercent').innerText = '0%';
//         return;
//     }
    
//     const donePercent = (currentStats.done / total) * 100;
//     const inProgressPercent = (currentStats.inProgress / total) * 100;
//     const todoPercent = (currentStats.todo / total) * 100;
    
//     chart.style.background = `conic-gradient(
//         #10b981 0% ${donePercent}%,
//         #3b82f6 ${donePercent}% ${donePercent + inProgressPercent}%,
//         #8b5cf6 ${donePercent + inProgressPercent}% 100%
//     )`;
    
//     // Центр
//     document.getElementById('centerPercent').innerText = `${Math.round(donePercent)}%`;
//     document.getElementById('centerLabel').innerText = 'выполнено';
// }

// function setupEvents() {
//     const chart = document.getElementById('donutChart');
//     if (!chart) return;
    
//     const container = chart.parentElement;
    
//     function getAngleFromEvent(e) {
//         const rect = chart.getBoundingClientRect();
//         const centerX = rect.left + rect.width / 2;
//         const centerY = rect.top + rect.height / 2;
//         const x = e.clientX - centerX;
//         const y = e.clientY - centerY;
//         let angle = Math.atan2(y, x) * 180 / Math.PI;
//         if (angle < 0) angle += 360;
//         return angle;
//     }
    
//     function getSegment(angle) {
//         const total = currentStats.total;
//         if (total === 0) return null;
        
//         const donePercent = (currentStats.done / total) * 360;
//         const inProgressPercent = (currentStats.inProgress / total) * 360;
//         const doneEnd = donePercent;
//         const inProgressEnd = donePercent + inProgressPercent;
        
//         if (angle <= doneEnd) return 'done';
//         if (angle <= inProgressEnd) return 'inProgress';
//         return 'todo';
//     }
    
//     function updateCenter(segment) {
//         const centerPercent = document.getElementById('centerPercent');
//         const centerLabel = document.getElementById('centerLabel');
//         const total = currentStats.total;
        
//         if (!segment || total === 0) {
//             centerPercent.innerText = '0%';
//             centerLabel.innerText = 'нет данных';
//             return;
//         }
        
//         let percent = 0;
//         let label = '';
        
//         if (segment === 'done') {
//             percent = Math.round((currentStats.done / total) * 100);
//             label = 'выполнено';
//         } else if (segment === 'inProgress') {
//             percent = Math.round((currentStats.inProgress / total) * 100);
//             label = 'в процессе';
//         } else {
//             percent = Math.round((currentStats.todo / total) * 100);
//             label = 'не начато';
//         }
        
//         centerPercent.innerText = `${percent}%`;
//         centerLabel.innerText = label;
//     }
    
//     function highlightSegment(segment) {
//         const chart = document.getElementById('donutChart');
//         if (!chart) return;
        
//         if (segment === 'done') {
//             chart.style.filter = 'drop-shadow(0 0 12px #10b981)';
//             chart.style.transform = 'scale(1.02)';
//         } else if (segment === 'inProgress') {
//             chart.style.filter = 'drop-shadow(0 0 12px #3b82f6)';
//             chart.style.transform = 'scale(1.02)';
//         } else if (segment === 'todo') {
//             chart.style.filter = 'drop-shadow(0 0 12px #8b5cf6)';
//             chart.style.transform = 'scale(1.02)';
//         } else {
//             chart.style.filter = 'none';
//             chart.style.transform = 'scale(1)';
//         }
//     }
    
//     container.addEventListener('mousemove', (e) => {
//         const angle = getAngleFromEvent(e);
//         const segment = getSegment(angle);
//         if (segment) {
//             updateCenter(segment);
//             highlightSegment(segment);
//         }
//     });
    
//     container.addEventListener('mouseleave', () => {
//         updateCenter('done');
//         highlightSegment(null);
//     });
// }

// // Тёмная тема
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





// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// let currentStats = { done: 0, inProgress: 0, todo: 0, total: 0 };
// let exactPercent = { done: 0, inProgress: 0, todo: 0 };
// let displayPercent = { done: 0, inProgress: 0, todo: 0 };

// async function loadStats() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/stats`, {
//             headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
//         });
//         const stats = await response.json();
        
//         currentStats.done = stats.done || 0;
//         currentStats.inProgress = stats.inProgress || 0;
//         currentStats.todo = stats.todo || 0;
//         currentStats.total = stats.total || 0;
        
//         // Точные проценты (для углов)
//         if (currentStats.total > 0) {
//             exactPercent.done = (currentStats.done / currentStats.total) * 100;
//             exactPercent.inProgress = (currentStats.inProgress / currentStats.total) * 100;
//             exactPercent.todo = (currentStats.todo / currentStats.total) * 100;
            
//             displayPercent.done = Math.round(exactPercent.done);
//             displayPercent.inProgress = Math.round(exactPercent.inProgress);
//             displayPercent.todo = Math.round(exactPercent.todo);
//         }
        
//         updateStatsCards();
//         drawDonutChart();
//         setupDonutEvents();
        
//     } catch (error) {
//         console.error('Ошибка загрузки статистики:', error);
//     }
// }

// function updateStatsCards() {
//     document.getElementById('doneCount').innerText = currentStats.done;
//     document.getElementById('progressCount').innerText = currentStats.inProgress;
//     document.getElementById('todoCount').innerText = currentStats.todo;
//     document.getElementById('totalCount').innerText = currentStats.total;
// }

// function drawDonutChart(activeSegment = null) {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     const doneEnd = exactPercent.done;
//     const inProgressEnd = doneEnd + exactPercent.inProgress;
    
//     // Цвета
//     const colors = {
//         done: '#10b981',
//         inProgress: '#3b82f6',
//         todo: '#8b5cf6'
//     };
    
//     let doneColor = colors.done;
//     let inProgressColor = colors.inProgress;
//     let todoColor = colors.todo;
    
//     if (activeSegment === 'done') {
//         doneColor = '#34d399';
//         inProgressColor = '#4b5563';
//         todoColor = '#4b5563';
//     } else if (activeSegment === 'inProgress') {
//         doneColor = '#4b5563';
//         inProgressColor = '#60a5fa';
//         todoColor = '#4b5563';
//     } else if (activeSegment === 'todo') {
//         doneColor = '#4b5563';
//         inProgressColor = '#4b5563';
//         todoColor = '#a78bfa';
//     }
    
//     donutChart.style.background = `conic-gradient(
//         from 0deg,
//         ${doneColor} 0% ${doneEnd}%,
//         ${inProgressColor} ${doneEnd}% ${inProgressEnd}%,
//         ${todoColor} ${inProgressEnd}% 100%
//     )`;
    
//     // Эффект при наведении
//     if (activeSegment) {
//         donutChart.style.transform = 'scale(1.02)';
//         donutChart.style.filter = `drop-shadow(0 0 12px ${activeSegment === 'done' ? '#10b981' : activeSegment === 'inProgress' ? '#3b82f6' : '#8b5cf6'})`;
//     } else {
//         donutChart.style.transform = 'scale(1)';
//         donutChart.style.filter = 'none';
//     }
// }

// function setupDonutEvents() {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     const container = donutChart.parentElement;
    
//     function getAngleFromEvent(e) {
//         const rect = donutChart.getBoundingClientRect();
//         const centerX = rect.left + rect.width / 2;
//         const centerY = rect.top + rect.height / 2;
//         let angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
//         if (angle < 0) angle += 360;
//         return angle;
//     }
    
//     function getSegmentFromAngle(angle) {
//         const doneEnd = exactPercent.done * 3.6;
//         const inProgressEnd = doneEnd + (exactPercent.inProgress * 3.6);
        
//         if (angle <= doneEnd) return 'done';
//         if (angle <= inProgressEnd) return 'inProgress';
//         return 'todo';
//     }
    
//     function updateCenter(segment) {
//         const centerPercent = document.getElementById('centerPercent');
//         const centerLabel = document.getElementById('centerLabel');
        
//         if (segment === 'done') {
//             centerPercent.innerText = `${displayPercent.done}%`;
//             centerLabel.innerText = 'выполнено';
//         } else if (segment === 'inProgress') {
//             centerPercent.innerText = `${displayPercent.inProgress}%`;
//             centerLabel.innerText = 'в процессе';
//         } else {
//             centerPercent.innerText = `${displayPercent.todo}%`;
//             centerLabel.innerText = 'не начато';
//         }
//     }
    
//     container.addEventListener('mousemove', (e) => {
//         const angle = getAngleFromEvent(e);
//         const segment = getSegmentFromAngle(angle);
//         updateCenter(segment);
//         drawDonutChart(segment);
//     });
    
//     container.addEventListener('mouseleave', () => {
//         updateCenter('done');
//         drawDonutChart(null);
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

// document.addEventListener('DOMContentLoaded', loadStats);


// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// let currentStats = { done: 0, inProgress: 0, todo: 0, total: 0 };
// let exactPercent = { done: 0, inProgress: 0, todo: 0 };
// let displayPercent = { done: 0, inProgress: 0, todo: 0 };

// async function loadStats() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/stats`, {
//             headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
//         });
//         const stats = await response.json();
        
//         currentStats.done = stats.done || 0;
//         currentStats.inProgress = stats.inProgress || 0;
//         currentStats.todo = stats.todo || 0;
//         currentStats.total = stats.total || 0;
        
//         if (currentStats.total > 0) {
//             exactPercent.done = (currentStats.done / currentStats.total) * 100;
//             exactPercent.inProgress = (currentStats.inProgress / currentStats.total) * 100;
//             exactPercent.todo = (currentStats.todo / currentStats.total) * 100;
            
//             displayPercent.done = Math.round(exactPercent.done);
//             displayPercent.inProgress = Math.round(exactPercent.inProgress);
//             displayPercent.todo = Math.round(exactPercent.todo);
//         }
        
//         updateStatsCards();
//         drawDonutChart();
//         setupDonutEvents();
        
//     } catch (error) {
//         console.error('Ошибка загрузки статистики:', error);
//     }
// }

// function updateStatsCards() {
//     document.getElementById('doneCount').innerText = currentStats.done;
//     document.getElementById('progressCount').innerText = currentStats.inProgress;
//     document.getElementById('todoCount').innerText = currentStats.todo;
//     document.getElementById('totalCount').innerText = currentStats.total;
// }

// function drawDonutChart(hoverSegment = null) {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     const doneEnd = exactPercent.done;
//     const inProgressEnd = doneEnd + exactPercent.inProgress;
    
//     // Цвета
//     const colors = {
//         done: { normal: '#10b981', hover: '#34d399', dim: '#6ee7b7' },
//         inProgress: { normal: '#3b82f6', hover: '#60a5fa', dim: '#93c5fd' },
//         todo: { normal: '#8b5cf6', hover: '#a78bfa', dim: '#c4b5fd' }
//     };
    
//     let doneColor = colors.done.normal;
//     let inProgressColor = colors.inProgress.normal;
//     let todoColor = colors.todo.normal;
    
//     if (hoverSegment === 'done') {
//         doneColor = colors.done.hover;
//         inProgressColor = colors.inProgress.dim;
//         todoColor = colors.todo.dim;
//     } else if (hoverSegment === 'inProgress') {
//         doneColor = colors.done.dim;
//         inProgressColor = colors.inProgress.hover;
//         todoColor = colors.todo.dim;
//     } else if (hoverSegment === 'todo') {
//         doneColor = colors.done.dim;
//         inProgressColor = colors.inProgress.dim;
//         todoColor = colors.todo.hover;
//     }
    
//     donutChart.style.background = `conic-gradient(
//         from 0deg,
//         ${doneColor} 0% ${doneEnd}%,
//         ${inProgressColor} ${doneEnd}% ${inProgressEnd}%,
//         ${todoColor} ${inProgressEnd}% 100%
//     )`;
    
//     donutChart.style.transform = hoverSegment ? 'scale(1.02)' : 'scale(1)';
// }

// function setupDonutEvents() {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     const container = donutChart.parentElement;
    
//     function getAngleFromEvent(e) {
//         const rect = donutChart.getBoundingClientRect();
//         const centerX = rect.left + rect.width / 2;
//         const centerY = rect.top + rect.height / 2;
//         let angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
//         if (angle < 0) angle += 360;
//         return angle;
//     }
    
//     function getSegmentFromAngle(angle) {
//         const doneEnd = exactPercent.done * 3.6;
//         const inProgressEnd = doneEnd + (exactPercent.inProgress * 3.6);
        
//         if (angle <= doneEnd) return 'done';
//         if (angle <= inProgressEnd) return 'inProgress';
//         return 'todo';
//     }
    
//     function updateCenter(segment) {
//         const centerPercent = document.getElementById('centerPercent');
//         const centerLabel = document.getElementById('centerLabel');
        
//         if (segment === 'done') {
//             centerPercent.innerText = `${displayPercent.done}%`;
//             centerLabel.innerText = 'выполнено';
//         } else if (segment === 'inProgress') {
//             centerPercent.innerText = `${displayPercent.inProgress}%`;
//             centerLabel.innerText = 'в процессе';
//         } else if (segment === 'todo') {
//             centerPercent.innerText = `${displayPercent.todo}%`;
//             centerLabel.innerText = 'не начато';
//         }
//     }
    
//     container.addEventListener('mousemove', (e) => {
//         const angle = getAngleFromEvent(e);
//         const segment = getSegmentFromAngle(angle);
//         updateCenter(segment);
//         drawDonutChart(segment);
//     });
    
//     container.addEventListener('mouseleave', () => {
//         updateCenter('done');
//         drawDonutChart(null);
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

// document.addEventListener('DOMContentLoaded', loadStats);



// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// let currentStats = { done: 0, inProgress: 0, todo: 0, total: 0 };
// let exactPercent = { done: 0, inProgress: 0, todo: 0 };
// let displayPercent = { done: 0, inProgress: 0, todo: 0 };

// async function loadStats() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/stats`, {
//             headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
//         });
//         const stats = await response.json();
        
//         currentStats.done = stats.done || 0;
//         currentStats.inProgress = stats.inProgress || 0;
//         currentStats.todo = stats.todo || 0;
//         currentStats.total = stats.total || 0;
        
//         if (currentStats.total > 0) {
//             exactPercent.todo = (currentStats.todo / currentStats.total) * 100;
//             exactPercent.inProgress = (currentStats.inProgress / currentStats.total) * 100;
//             exactPercent.done = (currentStats.done / currentStats.total) * 100;
            
//             displayPercent.todo = Math.round(exactPercent.todo);
//             displayPercent.inProgress = Math.round(exactPercent.inProgress);
//             displayPercent.done = Math.round(exactPercent.done);
//         }
        
//         updateStatsCards();
//         drawDonutChart();
//         setupDonutEvents();
        
//     } catch (error) {
//         console.error('Ошибка загрузки статистики:', error);
//     }
// }

// function updateStatsCards() {
//     document.getElementById('doneCount').innerText = currentStats.done;
//     document.getElementById('progressCount').innerText = currentStats.inProgress;
//     document.getElementById('todoCount').innerText = currentStats.todo;
//     document.getElementById('totalCount').innerText = currentStats.total;
// }

// function drawDonutChart(hoverSegment = null) {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     const todoEnd = exactPercent.todo;
//     const inProgressEnd = todoEnd + exactPercent.inProgress;
    
//     const colors = {
//         todo: { normal: '#8b5cf6', hover: '#a78bfa', dim: '#c4b5fd' },
//         inProgress: { normal: '#3b82f6', hover: '#60a5fa', dim: '#93c5fd' },
//         done: { normal: '#10b981', hover: '#34d399', dim: '#6ee7b7' }
//     };
    
//     let todoColor = colors.todo.normal;
//     let inProgressColor = colors.inProgress.normal;
//     let doneColor = colors.done.normal;
    
//     if (hoverSegment === 'todo') {
//         todoColor = colors.todo.hover;
//         inProgressColor = colors.inProgress.dim;
//         doneColor = colors.done.dim;
//     } else if (hoverSegment === 'inProgress') {
//         todoColor = colors.todo.dim;
//         inProgressColor = colors.inProgress.hover;
//         doneColor = colors.done.dim;
//     } else if (hoverSegment === 'done') {
//         todoColor = colors.todo.dim;
//         inProgressColor = colors.inProgress.dim;
//         doneColor = colors.done.hover;
//     }
    
//     donutChart.style.background = `conic-gradient(
//         from 0deg,
//         ${todoColor} 0% ${todoEnd}%,
//         ${inProgressColor} ${todoEnd}% ${inProgressEnd}%,
//         ${doneColor} ${inProgressEnd}% 100%
//     )`;
    
//     donutChart.style.transform = hoverSegment ? 'scale(1.02)' : 'scale(1)';
// }

// function setupDonutEvents() {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     const container = donutChart.parentElement;
    
//     function getAngleFromEvent(e) {
//         const rect = donutChart.getBoundingClientRect();
//         const centerX = rect.left + rect.width / 2;
//         const centerY = rect.top + rect.height / 2;
//         let angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
//         if (angle < 0) angle += 360;
//         return angle;
//     }
    
//     function getSegmentFromAngle(angle) {
//         const todoEnd = exactPercent.todo * 3.6;
//         const inProgressEnd = todoEnd + (exactPercent.inProgress * 3.6);
        
//         if (angle <= todoEnd) return 'todo';
//         if (angle <= inProgressEnd) return 'inProgress';
//         return 'done';
//     }
    
//     function updateCenter(segment) {
//         const centerPercent = document.getElementById('centerPercent');
//         const centerLabel = document.getElementById('centerLabel');
        
//         if (segment === 'todo') {
//             centerPercent.innerText = `${displayPercent.todo}%`;
//             centerLabel.innerText = 'не начато';
//         } else if (segment === 'inProgress') {
//             centerPercent.innerText = `${displayPercent.inProgress}%`;
//             centerLabel.innerText = 'в процессе';
//         } else if (segment === 'done') {
//             centerPercent.innerText = `${displayPercent.done}%`;
//             centerLabel.innerText = 'выполнено';
//         }
//     }
    
//     container.addEventListener('mousemove', (e) => {
//         const angle = getAngleFromEvent(e);
//         const segment = getSegmentFromAngle(angle);
//         updateCenter(segment);
//         drawDonutChart(segment);
//     });
    
//     container.addEventListener('mouseleave', () => {
//         updateCenter('todo');
//         drawDonutChart(null);
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

// document.addEventListener('DOMContentLoaded', loadStats);

const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

let currentStats = { done: 0, inProgress: 0, todo: 0, total: 0 };
let exactPercent = { done: 0, inProgress: 0, todo: 0 };
let displayPercent = { done: 0, inProgress: 0, todo: 0 };
let segmentBoundaries = [];

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const stats = await response.json();
        
        currentStats.done = stats.done || 0;
        currentStats.inProgress = stats.inProgress || 0;
        currentStats.todo = stats.todo || 0;
        currentStats.total = stats.total || 0;
        
        if (currentStats.total > 0) {
            // Точные проценты
            const total = currentStats.total;
            exactPercent.todo = (currentStats.todo / total) * 100;
            exactPercent.inProgress = (currentStats.inProgress / total) * 100;
            exactPercent.done = (currentStats.done / total) * 100;
            
            displayPercent.todo = Math.round(exactPercent.todo);
            displayPercent.inProgress = Math.round(exactPercent.inProgress);
            displayPercent.done = Math.round(exactPercent.done);
            
            // Границы секторов в градусах (от 0 до 360)
            segmentBoundaries = [
                { name: 'todo', start: 0, end: exactPercent.todo * 3.6 },
                { name: 'inProgress', start: exactPercent.todo * 3.6, end: (exactPercent.todo + exactPercent.inProgress) * 3.6 },
                { name: 'done', start: (exactPercent.todo + exactPercent.inProgress) * 3.6, end: 360 }
            ];
        }
        
        updateStatsCards();
        drawDonutChart();
        setupDonutEvents();
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

function updateStatsCards() {
    document.getElementById('doneCount').innerText = currentStats.done;
    document.getElementById('progressCount').innerText = currentStats.inProgress;
    document.getElementById('todoCount').innerText = currentStats.todo;
    document.getElementById('totalCount').innerText = currentStats.total;
}

function drawDonutChart(hoverSegment = null) {
    const donutChart = document.getElementById('donutChart');
    if (!donutChart) return;
    
    const todoEnd = exactPercent.todo;
    const inProgressEnd = todoEnd + exactPercent.inProgress;
    
    const colors = {
        todo: { normal: '#8b5cf6', hover: '#a78bfa', dim: '#c4b5fd' },
        inProgress: { normal: '#3b82f6', hover: '#60a5fa', dim: '#93c5fd' },
        done: { normal: '#10b981', hover: '#34d399', dim: '#6ee7b7' }
    };
    
    let todoColor = colors.todo.normal;
    let inProgressColor = colors.inProgress.normal;
    let doneColor = colors.done.normal;
    
    if (hoverSegment === 'todo') {
        todoColor = colors.todo.hover;
        inProgressColor = colors.inProgress.dim;
        doneColor = colors.done.dim;
    } else if (hoverSegment === 'inProgress') {
        todoColor = colors.todo.dim;
        inProgressColor = colors.inProgress.hover;
        doneColor = colors.done.dim;
    } else if (hoverSegment === 'done') {
        todoColor = colors.todo.dim;
        inProgressColor = colors.inProgress.dim;
        doneColor = colors.done.hover;
    }
    
    donutChart.style.background = `conic-gradient(
        from 0deg,
        ${todoColor} 0% ${todoEnd}%,
        ${inProgressColor} ${todoEnd}% ${inProgressEnd}%,
        ${doneColor} ${inProgressEnd}% 100%
    )`;
    
    donutChart.style.transform = hoverSegment ? 'scale(1.02)' : 'scale(1)';
}

function setupDonutEvents() {
    const donutChart = document.getElementById('donutChart');
    if (!donutChart) return;
    
    const container = donutChart.parentElement;
    
    function getAngleFromEvent(e) {
        const rect = donutChart.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        return angle;
    }
    
    function getSegmentFromAngle(angle) {
        for (const boundary of segmentBoundaries) {
            if (angle >= boundary.start && angle <= boundary.end) {
                return boundary.name;
            }
        }
        return 'todo';
    }
    
    function updateCenter(segment) {
        const centerPercent = document.getElementById('centerPercent');
        const centerLabel = document.getElementById('centerLabel');
        
        if (segment === 'todo') {
            centerPercent.innerText = `${displayPercent.todo}%`;
            centerLabel.innerText = 'не начато';
        } else if (segment === 'inProgress') {
            centerPercent.innerText = `${displayPercent.inProgress}%`;
            centerLabel.innerText = 'в процессе';
        } else if (segment === 'done') {
            centerPercent.innerText = `${displayPercent.done}%`;
            centerLabel.innerText = 'выполнено';
        }
    }
    
    container.addEventListener('mousemove', (e) => {
        const angle = getAngleFromEvent(e);
        const segment = getSegmentFromAngle(angle);
        updateCenter(segment);
        drawDonutChart(segment);
    });
    
    container.addEventListener('mouseleave', () => {
        updateCenter('todo');
        drawDonutChart(null);
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
            body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            themeToggle.textContent = '☀️ Светлая тема';
        }
    });
}

document.addEventListener('DOMContentLoaded', loadStats);




// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// let currentStats = { done: 0, inProgress: 0, todo: 0, total: 0 };
// let currentPercent = { done: 0, inProgress: 0, todo: 0 };

// async function loadStats() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/stats`, {
//             headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
//         });
//         const stats = await response.json();
        
//         currentStats.done = stats.done || 0;
//         currentStats.inProgress = stats.inProgress || 0;
//         currentStats.todo = stats.todo || 0;
//         currentStats.total = stats.total || 0;
        
//         currentPercent.done = currentStats.total === 0 ? 0 : Math.round((currentStats.done / currentStats.total) * 100);
//         currentPercent.inProgress = currentStats.total === 0 ? 0 : Math.round((currentStats.inProgress / currentStats.total) * 100);
//         currentPercent.todo = currentStats.total === 0 ? 0 : Math.round((currentStats.todo / currentStats.total) * 100);
        
//         updateStatsCards();
//         drawDonutChart();
//         setupDonutHover();
        
//     } catch (error) {
//         console.error('Ошибка загрузки статистики:', error);
//     }
// }

// function updateStatsCards() {
//     document.getElementById('doneCount').innerText = currentStats.done;
//     document.getElementById('progressCount').innerText = currentStats.inProgress;
//     document.getElementById('todoCount').innerText = currentStats.todo;
//     document.getElementById('totalCount').innerText = currentStats.total;
// }







// function drawDonutChart(highlightSegment = null) {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     const colors = {
//         todo: '#8b5cf6',      // фиолетовый – не начато
//         inProgress: '#3b82f6', // синий – в процессе
//         done: '#10b981'        // зелёный – выполнено
//     };
    
//     // ПОРЯДОК: сначала фиолетовый (не начато), потом синий (в процессе), потом зелёный (выполнено)
//     const todoAngle = currentPercent.todo;
//     const inProgressAngle = currentPercent.inProgress;
//     const doneAngle = currentPercent.done;
    
//     // Проверка на корректность
//     console.log('Углы:', todoAngle, inProgressAngle, doneAngle);
    
//     donutChart.style.background = `conic-gradient(
//         ${colors.todo} 0% ${todoAngle}%,
//         ${colors.inProgress} ${todoAngle}% ${todoAngle + inProgressAngle}%,
//         ${colors.done} ${todoAngle + inProgressAngle}% 100%
//     )`;
    
//     // Эффект при наведении
//     if (highlightSegment === 'todo') {
//         donutChart.style.transform = 'scale(1.05)';
//         donutChart.style.filter = 'drop-shadow(0 0 8px #8b5cf6)';
//     } else if (highlightSegment === 'inProgress') {
//         donutChart.style.transform = 'scale(1.05)';
//         donutChart.style.filter = 'drop-shadow(0 0 8px #3b82f6)';
//     } else if (highlightSegment === 'done') {
//         donutChart.style.transform = 'scale(1.05)';
//         donutChart.style.filter = 'drop-shadow(0 0 8px #10b981)';
//     } else {
//         donutChart.style.transform = 'scale(1)';
//         donutChart.style.filter = 'none';
//     }
// }
// // function drawDonutChart(highlightSegment = null) {
// //     const donutChart = document.getElementById('donutChart');
// //     if (!donutChart) return;
    
// //     const colors = {
// //         done: '#10b981',
// //         inProgress: '#3b82f6',
// //         todo: '#8b5cf6'
// //     };
    
// //     // Нормальные цвета
// //     let doneColor = colors.done;
// //     let inProgressColor = colors.inProgress;
// //     let todoColor = colors.todo;
    
// //     const doneAngle = currentPercent.done;
// //     const inProgressAngle = currentPercent.inProgress;
// //     const todoAngle = currentPercent.todo;
    
// //     donutChart.style.background = `conic-gradient(
// //         ${doneColor} 0% ${doneAngle}%,
// //         ${inProgressColor} ${doneAngle}% ${doneAngle + inProgressAngle}%,
// //         ${todoColor} ${doneAngle + inProgressAngle}% 100%
// //     )`;
    
// //     // Добавляем эффект "выдвижения" при подсветке (через transform)
// //     if (highlightSegment === 'done') {
// //         donutChart.style.transform = 'scale(1.05)';
// //         donutChart.style.filter = 'drop-shadow(0 0 8px #10b981)';
// //     } else if (highlightSegment === 'inProgress') {
// //         donutChart.style.transform = 'scale(1.05)';
// //         donutChart.style.filter = 'drop-shadow(0 0 8px #3b82f6)';
// //     } else if (highlightSegment === 'todo') {
// //         donutChart.style.transform = 'scale(1.05)';
// //         donutChart.style.filter = 'drop-shadow(0 0 8px #8b5cf6)';
// //     } else {
// //         donutChart.style.transform = 'scale(1)';
// //         donutChart.style.filter = 'none';
// //     }
// // }

// // function setupDonutHover() {
// //     const donutChart = document.getElementById('donutChart');
// //     if (!donutChart) return;
    
// //     const container = donutChart.parentElement;
    
// //     function getSegmentAtAngle(angle) {
// //         const doneAngle = currentPercent.done * 3.6;
// //         const inProgressAngle = doneAngle + (currentPercent.inProgress * 3.6);
        
// //         if (angle <= doneAngle) return 'done';
// //         if (angle <= inProgressAngle) return 'inProgress';
// //         return 'todo';
// //     }
    
// //     container.addEventListener('mousemove', (e) => {
// //         const rect = donutChart.getBoundingClientRect();
// //         const centerX = rect.left + rect.width / 2;
// //         const centerY = rect.top + rect.height / 2;
// //         const mouseX = e.clientX;
// //         const mouseY = e.clientY;
        
// //         let angle = Math.atan2(mouseY - centerY, mouseX - centerX) * 180 / Math.PI;
// //         if (angle < 0) angle += 360;
        
// //         const segment = getSegmentAtAngle(angle);
        
// //         // Подсветка и увеличение сектора
// //         drawDonutChart(segment);
        
// //         // Обновляем центр
// //         const centerPercent = document.getElementById('centerPercent');
// //         const centerLabel = document.getElementById('centerLabel');
        
// //         if (segment === 'done') {
// //             centerPercent.innerText = `${currentPercent.done}%`;
// //             centerLabel.innerText = 'выполнено';
// //         } else if (segment === 'inProgress') {
// //             centerPercent.innerText = `${currentPercent.inProgress}%`;
// //             centerLabel.innerText = 'в процессе';
// //         } else {
// //             centerPercent.innerText = `${currentPercent.todo}%`;
// //             centerLabel.innerText = 'не начато';
// //         }
// //     });
    
// //     container.addEventListener('mouseleave', () => {
// //         drawDonutChart(null);
// //         document.getElementById('centerPercent').innerText = `${currentPercent.done}%`;
// //         document.getElementById('centerLabel').innerText = 'выполнено';
// //     });
// // }

// function setupDonutHover() {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     const container = donutChart.parentElement;
    
//     function getSegmentAtAngle(angle) {
//         const doneAngle = currentPercent.done * 3.6;
//         const inProgressAngle = doneAngle + (currentPercent.inProgress * 3.6);
        
//         if (angle <= doneAngle) return 'done';
//         if (angle <= inProgressAngle) return 'inProgress';
//         return 'todo';
//     }
    
//     // При движении мыши – подсветка и смена центра
//     container.addEventListener('mousemove', (e) => {
//         const rect = donutChart.getBoundingClientRect();
//         const centerX = rect.left + rect.width / 2;
//         const centerY = rect.top + rect.height / 2;
//         const mouseX = e.clientX;
//         const mouseY = e.clientY;
        
//         let angle = Math.atan2(mouseY - centerY, mouseX - centerX) * 180 / Math.PI;
//         if (angle < 0) angle += 360;
        
//         const segment = getSegmentAtAngle(angle);
        
//         // Подсветка и увеличение
//         drawDonutChart(segment);
        
//         // Обновляем центр
//         const centerPercent = document.getElementById('centerPercent');
//         const centerLabel = document.getElementById('centerLabel');
        
//         if (segment === 'done') {
//             centerPercent.innerText = `${currentPercent.done}%`;
//             centerLabel.innerText = 'выполнено';
//         } else if (segment === 'inProgress') {
//             centerPercent.innerText = `${currentPercent.inProgress}%`;
//             centerLabel.innerText = 'в процессе';
//         } else {
//             centerPercent.innerText = `${currentPercent.todo}%`;
//             centerLabel.innerText = 'не начато';
//         }
//     });
    
//     // При уходе мыши – возвращаем нормальный вид
//     container.addEventListener('mouseleave', () => {
//         drawDonutChart(null);
//         document.getElementById('centerPercent').innerText = `${currentPercent.done}%`;
//         document.getElementById('centerLabel').innerText = 'выполнено';
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

// document.addEventListener('DOMContentLoaded', loadStats);















// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// let currentStats = { done: 0, inProgress: 0, todo: 0, total: 0 };
// let currentPercent = { done: 0, inProgress: 0, todo: 0 };

// async function loadStats() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/stats`, {
//             headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
//         });
//         const stats = await response.json();
        
//         currentStats.done = stats.done || 0;
//         currentStats.inProgress = stats.inProgress || 0;
//         currentStats.todo = stats.todo || 0;
//         currentStats.total = stats.total || 0;
        
//         currentPercent.done = currentStats.total === 0 ? 0 : Math.round((currentStats.done / currentStats.total) * 100);
//         currentPercent.inProgress = currentStats.total === 0 ? 0 : Math.round((currentStats.inProgress / currentStats.total) * 100);
//         currentPercent.todo = currentStats.total === 0 ? 0 : Math.round((currentStats.todo / currentStats.total) * 100);
        
//         updateStatsCards();
//         updateDonutChart();
//         setupInteractiveDonut();
        
//     } catch (error) {
//         console.error('Ошибка загрузки статистики:', error);
//     }
// }

// function updateStatsCards() {
//     document.getElementById('doneCount').innerText = currentStats.done;
//     document.getElementById('progressCount').innerText = currentStats.inProgress;
//     document.getElementById('todoCount').innerText = currentStats.todo;
//     document.getElementById('totalCount').innerText = currentStats.total;
// }

// function updateDonutChart(highlightSegment = null) {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     // Базовые цвета секторов
//     const colors = {
//         done: { main: '#10b981', light: '#34d399' },
//         inProgress: { main: '#3b82f6', light: '#60a5fa' },
//         todo: { main: '#8b5cf6', light: '#a78bfa' }
//     };
    
//     // Если сектор подсвечен – делаем его ярче, остальные тусклее
//     let doneColor, inProgressColor, todoColor;
    
//     if (highlightSegment === 'done') {
//         doneColor = colors.done.light;
//         inProgressColor = '#4b5563';
//         todoColor = '#4b5563';
//     } else if (highlightSegment === 'inProgress') {
//         doneColor = '#4b5563';
//         inProgressColor = colors.inProgress.light;
//         todoColor = '#4b5563';
//     } else if (highlightSegment === 'todo') {
//         doneColor = '#4b5563';
//         inProgressColor = '#4b5563';
//         todoColor = colors.todo.light;
//     } else {
//         doneColor = colors.done.main;
//         inProgressColor = colors.inProgress.main;
//         todoColor = colors.todo.main;
//     }
    
//     const doneAngle = currentPercent.done;
//     const inProgressAngle = currentPercent.inProgress;
//     const todoAngle = currentPercent.todo;
    
//     donutChart.style.background = `conic-gradient(
//         ${doneColor} 0% ${doneAngle}%,
//         ${inProgressColor} ${doneAngle}% ${doneAngle + inProgressAngle}%,
//         ${todoColor} ${doneAngle + inProgressAngle}% 100%
//     )`;
// }

// function setupInteractiveDonut() {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     const container = donutChart.parentElement;
    
//     // Функция для определения сектора по углу
//     function getSegmentAtAngle(angle) {
//         const doneAngle = currentPercent.done * 3.6;
//         const inProgressAngle = doneAngle + (currentPercent.inProgress * 3.6);
        
//         if (angle <= doneAngle) return 'done';
//         if (angle <= inProgressAngle) return 'inProgress';
//         return 'todo';
//     }
    
//     // При движении мыши – подсветка сектора
//     container.addEventListener('mousemove', (e) => {
//         const rect = donutChart.getBoundingClientRect();
//         const centerX = rect.left + rect.width / 2;
//         const centerY = rect.top + rect.height / 2;
//         const mouseX = e.clientX;
//         const mouseY = e.clientY;
        
//         let angle = Math.atan2(mouseY - centerY, mouseX - centerX) * 180 / Math.PI;
//         if (angle < 0) angle += 360;
        
//         const segment = getSegmentAtAngle(angle);
        
//         // Подсветка сектора
//         updateDonutChart(segment);
        
//         // Обновляем центр круга
//         const centerPercent = document.getElementById('centerPercent');
//         const centerLabel = document.getElementById('centerLabel');
        
//         if (segment === 'done') {
//             centerPercent.innerText = `${currentPercent.done}%`;
//             centerLabel.innerText = 'выполнено';
//         } else if (segment === 'inProgress') {
//             centerPercent.innerText = `${currentPercent.inProgress}%`;
//             centerLabel.innerText = 'в процессе';
//         } else {
//             centerPercent.innerText = `${currentPercent.todo}%`;
//             centerLabel.innerText = 'не начато';
//         }
//     });
    
//     // При уходе мыши – возвращаем обычный вид
//     container.addEventListener('mouseleave', () => {
//         updateDonutChart(null);
//         // Возвращаем центр к "выполнено" (или можно к последнему активному)
//         document.getElementById('centerPercent').innerText = `${currentPercent.done}%`;
//         document.getElementById('centerLabel').innerText = 'выполнено';
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

// document.addEventListener('DOMContentLoaded', loadStats);















// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// let currentStats = { done: 0, inProgress: 0, todo: 0, total: 0 };
// let currentPercent = { done: 0, inProgress: 0, todo: 0 };
// let activeSegment = 'done'; // done, inProgress, todo

// async function loadStats() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/stats`, {
//             headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
//         });
//         const stats = await response.json();
        
//         currentStats.done = stats.done || 0;
//         currentStats.inProgress = stats.inProgress || 0;
//         currentStats.todo = stats.todo || 0;
//         currentStats.total = stats.total || 0;
        
//         currentPercent.done = currentStats.total === 0 ? 0 : Math.round((currentStats.done / currentStats.total) * 100);
//         currentPercent.inProgress = currentStats.total === 0 ? 0 : Math.round((currentStats.inProgress / currentStats.total) * 100);
//         currentPercent.todo = currentStats.total === 0 ? 0 : Math.round((currentStats.todo / currentStats.total) * 100);
        
//         updateStatsCards();
//         updateDonutChart('done');
//         setupInteractiveDonut();
        
//     } catch (error) {
//         console.error('Ошибка загрузки статистики:', error);
//     }
// }

// function updateStatsCards() {
//     document.getElementById('doneCount').innerText = currentStats.done;
//     document.getElementById('progressCount').innerText = currentStats.inProgress;
//     document.getElementById('todoCount').innerText = currentStats.todo;
//     document.getElementById('totalCount').innerText = currentStats.total;
// }

// function updateDonutChart(segment) {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     activeSegment = segment;
    
//     // НОВЫЕ ЦВЕТА – элегантные, под ваш дизайн
//     const colors = {
//         done: { main: '#10b981', light: '#34d399' },      // изумрудный
//         inProgress: { main: '#3b82f6', light: '#60a5fa' }, // синий
//         todo: { main: '#8b5cf6', light: '#a78bfa' }        // фиолетовый
//     };
    
//     let gradient;
//     if (segment === 'done') {
//         gradient = `conic-gradient(${colors.done.main} 0% ${currentPercent.done}%, ${colors.done.light} ${currentPercent.done}% 100%)`;
//     } else if (segment === 'inProgress') {
//         gradient = `conic-gradient(${colors.inProgress.main} 0% ${currentPercent.inProgress}%, ${colors.inProgress.light} ${currentPercent.inProgress}% 100%)`;
//     } else {
//         gradient = `conic-gradient(${colors.todo.main} 0% ${currentPercent.todo}%, ${colors.todo.light} ${currentPercent.todo}% 100%)`;
//     }
    
//     donutChart.style.background = gradient;
    
//     // Обновляем центр
//     const centerPercent = document.getElementById('centerPercent');
//     const centerLabel = document.getElementById('centerLabel');
    
//     if (segment === 'done') {
//         centerPercent.innerText = `${currentPercent.done}%`;
//         centerLabel.innerText = 'выполнено';
//     } else if (segment === 'inProgress') {
//         centerPercent.innerText = `${currentPercent.inProgress}%`;
//         centerLabel.innerText = 'в процессе';
//     } else {
//         centerPercent.innerText = `${currentPercent.todo}%`;
//         centerLabel.innerText = 'не начато';
//     }
// }

// function setupInteractiveDonut() {
//     const donutChart = document.getElementById('donutChart');
//     if (!donutChart) return;
    
//     // Обработка кликов на сектора (через родительский контейнер)
//     const container = donutChart.parentElement;
    
//     container.addEventListener('click', (e) => {
//         const rect = donutChart.getBoundingClientRect();
//         const centerX = rect.left + rect.width / 2;
//         const centerY = rect.top + rect.height / 2;
//         const mouseX = e.clientX;
//         const mouseY = e.clientY;
        
//         let angle = Math.atan2(mouseY - centerY, mouseX - centerX) * 180 / Math.PI;
//         if (angle < 0) angle += 360;
        
//         const doneAngle = currentPercent.done * 3.6;
//         const inProgressAngle = doneAngle + (currentPercent.inProgress * 3.6);
        
//         if (angle <= doneAngle) {
//             updateDonutChart('done');
//         } else if (angle <= inProgressAngle) {
//             updateDonutChart('inProgress');
//         } else {
//             updateDonutChart('todo');
//         }
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

// document.addEventListener('DOMContentLoaded', loadStats);












// // frontend/stats.js
// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// // Получение токена
// function getToken() {
//     const token = localStorage.getItem('token');
//     if (!token) {
//         window.location.href = 'login.html';
//         return null;
//     }
//     return token;
// }

// // Получение текущей доски (из localStorage)
// function getCurrentBoardId() {
//     return localStorage.getItem('currentBoardId') || null;
// }

// // Получение всех задач текущей доски
// async function fetchBoardTasks() {
//     const token = getToken();
//     const boardId = getCurrentBoardId();
//     if (!token || !boardId) return [];

//     try {
//         // Получаем колонки доски
//         const columnsResponse = await fetch(`${API_BASE_URL}/columns?board_id=${boardId}`, {
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
        
//         if (!columnsResponse.ok) return [];
        
//         const columns = await columnsResponse.json();
//         if (!Array.isArray(columns)) return [];
        
//         let allTasks = [];
        
//         for (const column of columns) {
//             const tasksResponse = await fetch(`${API_BASE_URL}/tasks?column_id=${column.id}`, {
//                 headers: { 'Authorization': `Bearer ${token}` }
//             });
            
//             if (tasksResponse.ok) {
//                 const data = await tasksResponse.json();
//                 const tasks = data.data || data;
//                 if (Array.isArray(tasks)) {
//                     allTasks = allTasks.concat(tasks.map(task => ({
//                         ...task,
//                         column_title: column.title
//                     })));
//                 }
//             }
//         }
        
//         return allTasks;
//     } catch (error) {
//         console.error('Error fetching tasks:', error);
//         return [];
//     }
// }

// // Подсчёт статистики
// function calculateStats(tasks) {
//     const todoCount = tasks.filter(t => 
//         t.column_title === 'To Do' || 
//         t.column_title === '📋 К выполнению' ||
//         t.column_title === 'Todo'
//     ).length;
    
//     const progressCount = tasks.filter(t => 
//         t.column_title === 'In Progress' || 
//         t.column_title === '⚙️ В процессе' ||
//         t.column_title === 'Progress'
//     ).length;
    
//     const doneCount = tasks.filter(t => 
//         t.column_title === 'Done' || 
//         t.column_title === '✅ Выполнено'
//     ).length;
    
//     const total = tasks.length;
    
//     return {
//         todo: todoCount,
//         progress: progressCount,
//         done: doneCount,
//         total: total,
//         completionRate: total > 0 ? Math.round((doneCount / total) * 100) : 0
//     };
// }

// // Обновление круговой диаграммы
// function updateDonutChart(stats) {
//     const donutElement = document.getElementById('donutChart');
//     const centerPercent = document.getElementById('centerPercent');
//     const centerLabel = document.getElementById('centerLabel');
    
//     if (!donutElement) return;
    
//     if (stats.total === 0) {
//         donutElement.style.background = 'conic-gradient(#e5e7eb 0% 100%)';
//         if (centerPercent) centerPercent.textContent = '0%';
//         return;
//     }
    
//     const todoPercent = (stats.todo / stats.total) * 100;
//     const progressPercent = (stats.progress / stats.total) * 100;
//     const donePercent = (stats.done / stats.total) * 100;
    
//     let gradient = `conic-gradient(`;
//     let hasPrevious = false;
    
//     if (stats.todo > 0) {
//         gradient += `#3b82f6 0% ${todoPercent}%`;
//         hasPrevious = true;
//     }
//     if (stats.progress > 0) {
//         if (hasPrevious) gradient += `, `;
//         gradient += `#f59e0b ${todoPercent}% ${todoPercent + progressPercent}%`;
//         hasPrevious = true;
//     }
//     if (stats.done > 0) {
//         if (hasPrevious) gradient += `, `;
//         gradient += `#10b981 ${todoPercent + progressPercent}% 100%`;
//     }
//     gradient += `)`;
    
//     donutElement.style.background = gradient;
    
//     if (centerPercent) centerPercent.textContent = `${stats.completionRate}%`;
//     if (centerLabel) centerLabel.textContent = 'выполнено';
// }

// // Обновление статистики на странице
// function updateStatsDisplay(stats) {
//     const doneEl = document.getElementById('doneCount');
//     const progressEl = document.getElementById('progressCount');
//     const todoEl = document.getElementById('todoCount');
//     const totalEl = document.getElementById('totalCount');
    
//     if (doneEl) doneEl.textContent = stats.done;
//     if (progressEl) progressEl.textContent = stats.progress;
//     if (todoEl) todoEl.textContent = stats.todo;
//     if (totalEl) totalEl.textContent = stats.total;
// }

// // Загрузка и отображение статистики
// async function loadStats() {
//     const token = getToken();
//     if (!token) return;
    
//     const boardId = getCurrentBoardId();
//     let tasks = [];
    
//     if (boardId) {
//         tasks = await fetchBoardTasks();
//     } else {
//         // Если нет выбранной доски, показываем заглушку
//         const totalEl = document.getElementById('totalCount');
//         if (totalEl) totalEl.textContent = '0';
//         const stats = { todo: 0, progress: 0, done: 0, total: 0, completionRate: 0 };
//         updateStatsDisplay(stats);
//         updateDonutChart(stats);
//         return;
//     }
    
//     const stats = calculateStats(tasks);
//     updateStatsDisplay(stats);
//     updateDonutChart(stats);
    
//     console.log('Статистика загружена:', stats);
// }

// // Тёмная тема
// const themeToggle = document.getElementById('themeToggle');
// const savedTheme = localStorage.getItem('theme');

// if (savedTheme === 'light') {
//     document.body.classList.remove('dark');
//     document.body.classList.add('light');
//     if (themeToggle) themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i> Тёмная';
// } else {
//     document.body.classList.add('dark');
//     document.body.classList.remove('light');
//     if (themeToggle) themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i> Светлая';
// }

// if (themeToggle) {
//     themeToggle.addEventListener('click', () => {
//         document.body.classList.toggle('dark');
//         document.body.classList.toggle('light');
//         const isDark = document.body.classList.contains('dark');
//         localStorage.setItem('theme', isDark ? 'dark' : 'light');
//         themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i> Светлая' : '<i class="fa-solid fa-moon"></i> Тёмная';
//     });
// }

// // Запуск
// document.addEventListener('DOMContentLoaded', loadStats);

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
