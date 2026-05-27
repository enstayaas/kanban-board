// frontend/labels.js

// frontend/labels.js

const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

let labels = [];
let selectedLabelFilters = [];




// async function loadLabels() {
//     const token = localStorage.getItem('token');
//     if (!token) return;

//     let boardId = localStorage.getItem('currentBoardId');
//     if (!boardId) {
//         // Пробуем взять ID из URL (для board.html)
//         const urlParams = new URLSearchParams(window.location.search);
//         boardId = urlParams.get('id');
//     }
//     if (!boardId) {
//         boardId = 1; // Доска по умолчанию
//     }

//     try {
//         const response = await fetch(`${API_BASE_URL}/labels?board_id=${boardId}`, {
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         if (response.ok) {
//             labels = await response.json();
//             window.labels = labels;
//         } else {
//             labels = [];
//             window.labels = [];
//         }
//     } catch (error) {
//         console.error('Failed to load labels:', error);
//         labels = [];
//         window.labels = [];
//     }
//     renderLabelsList();
//     renderLabelFilters();
// }

async function loadLabels() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    let boardId = localStorage.getItem('currentBoardId');
    if (!boardId) {
        boardId = 1;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/labels?board_id=${boardId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            labels = await response.json();
            window.labels = labels;
        } else {
            labels = [];
            window.labels = [];
        }
    } catch (error) {
        console.error('Failed to load labels:', error);
        labels = [];
        window.labels = [];
    }
    // ВСЕГДА вызываем отрисовку (даже если меток нет)
    renderLabelsList();
    renderLabelFilters();
}

// // Загрузка меток с сервера
// async function loadLabels() {
//     const token = localStorage.getItem('token');
//     if (!token) return;
    
//     let boardId = localStorage.getItem('currentBoardId');
//     if (!boardId) {
//         boardId = 1; // ID доски по умолчанию
//     }

//     try {
//         const response = await fetch(`${API_BASE_URL}/labels?board_id=${boardId}`, {
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         if (response.ok) {
//             labels = await response.json();
//             window.labels = labels;
//             renderLabelsList();
//             renderLabelFilters();
//         }
//     } catch (error) {
//         console.error('Failed to load labels:', error);
//     }
// }

// // Загрузка меток с сервера
// async function loadLabels() {
//     const token = localStorage.getItem('token');
//     if (!token) return;
    
//     const boardId = localStorage.getItem('currentBoardId') || 1;

//     try {
//         const response = await fetch(`${API_BASE_URL}/labels?board_id=${boardId}`, {
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         if (response.ok) {
//             labels = await response.json();
//             window.labels = labels;
//         }
//     } catch (error) {
//         console.error('Failed to load labels:', error);
//     }
//     renderLabelsList();
//     renderLabelFilters();
// }
// async function loadLabels() {
//     const token = localStorage.getItem('token');
//     if (!token) return;

//     try {
//         const response = await fetch(`${API_BASE_URL}/labels`, {
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         if (response.ok) {
//             labels = await response.json();
//              window.labels = labels; 
//         }
//     } catch (error) {
//         console.error('Failed to load labels:', error);
//     }
//     renderLabelsList();
//     renderLabelFilters();
// }

// ========== СОЗДАНИЕ МЕТКИ ==========
let isCreatingLabel = false;

async function createLabel() {
    if (isCreatingLabel) {
        showError('⏳ Подождите, метка уже создаётся');
        return;
    }
    
    const name = document.getElementById('newLabelName')?.value.trim();
    const color = document.getElementById('newLabelColor')?.value;
    const token = localStorage.getItem('token');
    
    if (!name) {
        showError('❌ Введите название метки');
        return;
    }
    
    if (!token) {
        showError('❌ Требуется авторизация');
        return;
    }
    
    isCreatingLabel = true;
    const createBtn = document.querySelector('.add-label-form button');
    const originalText = createBtn?.innerText;
    if (createBtn) createBtn.innerText = '⏳ Создание...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/labels`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, color })
        });
        
        if (!response.ok) {
            let errorMsg = 'Ошибка создания метки';
            try {
                const errData = await response.json();
                errorMsg = errData.error || errData.message || errorMsg;
            } catch(e) {}
            throw new Error(errorMsg);
        }
        
        const newLabel = await response.json();
        labels.push(newLabel);
        document.getElementById('newLabelName').value = '';
        renderLabelsList();
        renderLabelFilters();
        showSuccess('✅ Метка создана');
    } catch (error) {
        showError('❌ Ошибка при создании метки: ' + error.message);
    } finally {
        isCreatingLabel = false;
        if (createBtn) createBtn.innerText = originalText || '➕ Добавить метку';
    }
}

// ========== УДАЛЕНИЕ МЕТКИ ==========
let isDeletingLabel = false;

async function deleteLabel(labelId) {
    if (isDeletingLabel) {
        showError('⏳ Подождите, удаление уже выполняется');
        return;
    }
    
    const label = labels.find(l => l.id === labelId);
    if (!confirm(`Удалить метку "${label?.name || ''}"? Она отвяжется от всех задач.`)) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
        showError('❌ Требуется авторизация');
        return;
    }
    
    isDeletingLabel = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/labels/${labelId}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Ошибка удаления');
        
        labels = labels.filter(l => l.id !== labelId);
        renderLabelsList();
        renderLabelFilters();
        showSuccess('✅ Метка удалена');
    } catch (error) {
        showError('❌ Ошибка при удалении метки: ' + error.message);
    } finally {
        isDeletingLabel = false;
    }
}

// Отображение списка всех меток
function renderLabelsList() {
    const container = document.getElementById('labelsList');
    if (!container) return;
    
    if (labels.length === 0) {
        container.innerHTML = '<div style="color:#999;">Нет меток. Создайте первую!</div>';
        return;
    }
    
    container.innerHTML = labels.map(label => `
        <div class="label" style="background: ${label.color};">
            ${escapeHtml(label.name)}
            <span class="remove-label" onclick="deleteLabel(${label.id})">✖</span>
        </div>
    `).join('');
}

// Отображение фильтров по меткам
function renderLabelFilters() {
    const container = document.getElementById('labelFilters');
    if (!container) return;
    
    if (labels.length === 0) {
        container.innerHTML = '<div style="color:#999;">Создайте метки для фильтрации</div>';
        return;
    }
    
    container.innerHTML = labels.map(label => `
        <div class="label-filter ${selectedLabelFilters.includes(label.id) ? 'active' : ''}" 
             style="background: ${label.color};"
             onclick="toggleLabelFilter(${label.id})">
            ${escapeHtml(label.name)}
        </div>
    `).join('');
}

// Переключение фильтра метки
function toggleLabelFilter(labelId) {
    if (selectedLabelFilters.includes(labelId)) {
        selectedLabelFilters = selectedLabelFilters.filter(id => id !== labelId);
    } else {
        selectedLabelFilters.push(labelId);
    }
    renderLabelFilters();
    if (typeof loadTasks === 'function') {
        loadTasks();
    }
}

// Очистка фильтра меток
function clearLabelFilter() {
    selectedLabelFilters = [];
    renderLabelFilters();
    if (typeof loadTasks === 'function') {
        loadTasks();
    }
}

// Получение текущих фильтров меток
function getLabelFilters() {
    return selectedLabelFilters;
}

// Фильтрация задач по меткам (через API)
async function filterTasksByLabels(tasks) {
    if (selectedLabelFilters.length === 0) return tasks;
    
    const filtered = [];
    for (const task of tasks) {
        const taskLabels = await getTaskLabels(task.id);
        if (selectedLabelFilters.some(filterId => taskLabels.some(tl => tl.id === filterId))) {
            filtered.push(task);
        }
    }
    return filtered;
}

// ===== РАБОТА С МЕТКАМИ ЗАДАЧ =====

// Получение меток задачи с сервера
// Получение меток задачи
async function getTaskLabels(taskId) {
    const token = localStorage.getItem('token');
    if (!token) return [];
    
    const boardId = localStorage.getItem('currentBoardId') || 1;

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/labels?board_id=${boardId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Failed to load task labels:', error);
    }
    return [];
}
// async function getTaskLabels(taskId) {
//     const token = localStorage.getItem('token');
//     if (!token) return [];
    
//     try {
//         const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/labels`, {
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         if (response.ok) {
//             return await response.json();
//         }
//     } catch (error) {
//         console.error('Failed to load task labels:', error);
//     }
//     return [];
// }

// Добавление метки к задаче
async function addLabelToTask(taskId, labelId) {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/labels`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ label_id: labelId })
        });
        return response.ok;
    } catch (error) {
        console.error('Failed to add label:', error);
        return false;
    }
}

// Удаление метки у задачи
async function removeLabelFromTask(taskId, labelId) {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/labels/${labelId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.ok;
    } catch (error) {
        console.error('Failed to remove label:', error);
        return false;
    }
}

// Назначение/удаление метки при клике в модалке
let isToggling = false;

async function toggleTaskLabel(taskId, labelId, isChecked) {
    if (isToggling) {
        showError('⏳ Подождите, операция уже выполняется');
        return;
    }
    
    isToggling = true;
    
    try {
        if (isChecked) {
            await addLabelToTask(taskId, labelId);
        } else {
            await removeLabelFromTask(taskId, labelId);
        }
        
        if (typeof loadTasks === 'function') {
            await loadTasks();
        }
        showSuccess(isChecked ? '✅ Метка добавлена' : '✅ Метка убрана');
    } catch (error) {
        showError('❌ Ошибка при изменении меток');
    } finally {
        isToggling = false;
    }
}

// Получение меток задачи для отображения в карточке
async function getTaskLabelsForDisplay(taskId) {
    const taskLabels = await getTaskLabels(taskId);
    return labels.filter(label => taskLabels.some(tl => tl.id === label.id));
}

// Вспомогательные функции
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    console.error(message);
    const toast = document.getElementById('errorToast');
    if (toast) {
        toast.innerText = message;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 5000);
    } else {
        alert(message);
    }
}

function showSuccess(message) {
    console.log(message);
    const toast = document.getElementById('successToast');
    if (toast) {
        toast.innerText = message;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
    }
}

// Загрузка меток при старте
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        loadLabels();
    }
});





// // Импортируем API_BASE_URL из config.js
// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

// let labels = [];
// let selectedLabelFilters = [];

// // Загрузка меток с сервера
// async function loadLabels() {
//     const token = localStorage.getItem('token');
//     if (!token) return;

//     try {
//         const response = await fetch(`${API_BASE_URL}/labels`, {
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         if (response.ok) {
//             labels = await response.json();
//         }
//     } catch (error) {
//         console.error('Failed to load labels:', error);
//     }
//     renderLabelsList();
//     renderLabelFilters();
// }

// // ========== СОЗДАНИЕ МЕТКИ ==========
// let isCreatingLabel = false;

// async function createLabel() {
//     if (isCreatingLabel) {
//         showError('⏳ Подождите, метка уже создаётся');
//         return;
//     }
    
//     const name = document.getElementById('newLabelName')?.value.trim();
//     const color = document.getElementById('newLabelColor')?.value;
//     const token = localStorage.getItem('token');
    
//     if (!name) {
//         showError('❌ Введите название метки');
//         return;
//     }
    
//     if (!token) {
//         showError('❌ Требуется авторизация');
//         return;
//     }
    
//     isCreatingLabel = true;
//     const createBtn = document.querySelector('.add-label-form button');
//     const originalText = createBtn?.innerText;
//     if (createBtn) createBtn.innerText = '⏳ Создание...';
    
//     try {
//         const response = await fetch(`${API_BASE_URL}/labels`, {
//             method: 'POST',
//             headers: { 
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${token}`
//             },
//             body: JSON.stringify({ name, color })
//         });
        
//         if (!response.ok) {
//             let errorMsg = 'Ошибка создания метки';
//             try {
//                 const errData = await response.json();
//                 errorMsg = errData.error || errData.message || errorMsg;
//             } catch(e) {}
//             throw new Error(errorMsg);
//         }
        
//         const newLabel = await response.json();
//         labels.push(newLabel);
//         document.getElementById('newLabelName').value = '';
//         renderLabelsList();
//         renderLabelFilters();
//         showSuccess('✅ Метка создана');
//     } catch (error) {
//         showError('❌ Ошибка при создании метки: ' + error.message);
//     } finally {
//         isCreatingLabel = false;
//         if (createBtn) createBtn.innerText = originalText || '➕ Добавить метку';
//     }
// }

// // ========== УДАЛЕНИЕ МЕТКИ ==========
// let isDeletingLabel = false;

// async function deleteLabel(labelId) {
//     if (isDeletingLabel) {
//         showError('⏳ Подождите, удаление уже выполняется');
//         return;
//     }
    
//     const label = labels.find(l => l.id === labelId);
//     if (!confirm(`Удалить метку "${label?.name || ''}"? Она отвяжется от всех задач.`)) return;
    
//     const token = localStorage.getItem('token');
//     if (!token) {
//         showError('❌ Требуется авторизация');
//         return;
//     }
    
//     isDeletingLabel = true;
    
//     try {
//         const response = await fetch(`${API_BASE_URL}/labels/${labelId}`, { 
//             method: 'DELETE',
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         if (!response.ok) throw new Error('Ошибка удаления');
        
//         labels = labels.filter(l => l.id !== labelId);
//         renderLabelsList();
//         renderLabelFilters();
//         showSuccess('✅ Метка удалена');
//     } catch (error) {
//         showError('❌ Ошибка при удалении метки: ' + error.message);
//     } finally {
//         isDeletingLabel = false;
//     }
// }

// // Отображение списка всех меток
// function renderLabelsList() {
//     const container = document.getElementById('labelsList');
//     if (!container) return;
    
//     if (labels.length === 0) {
//         container.innerHTML = '<div style="color:#999;">Нет меток. Создайте первую!</div>';
//         return;
//     }
    
//     container.innerHTML = labels.map(label => `
//         <div class="label" style="background: ${label.color};">
//             ${escapeHtml(label.name)}
//             <span class="remove-label" onclick="deleteLabel(${label.id})">✖</span>
//         </div>
//     `).join('');
// }

// // Отображение фильтров по меткам
// function renderLabelFilters() {
//     const container = document.getElementById('labelFilters');
//     if (!container) return;
    
//     if (labels.length === 0) {
//         container.innerHTML = '<div style="color:#999;">Создайте метки для фильтрации</div>';
//         return;
//     }
    
//     container.innerHTML = labels.map(label => `
//         <div class="label-filter ${selectedLabelFilters.includes(label.id) ? 'active' : ''}" 
//              style="background: ${label.color};"
//              onclick="toggleLabelFilter(${label.id})">
//             ${escapeHtml(label.name)}
//         </div>
//     `).join('');
// }

// // Переключение фильтра метки
// function toggleLabelFilter(labelId) {
//     if (selectedLabelFilters.includes(labelId)) {
//         selectedLabelFilters = selectedLabelFilters.filter(id => id !== labelId);
//     } else {
//         selectedLabelFilters.push(labelId);
//     }
//     renderLabelFilters();
//     if (typeof loadTasks === 'function') {
//         loadTasks();
//     }
// }

// // Очистка фильтра меток
// function clearLabelFilter() {
//     selectedLabelFilters = [];
//     renderLabelFilters();
//     if (typeof loadTasks === 'function') {
//         loadTasks();
//     }
// }

// // Получение текущих фильтров меток
// function getLabelFilters() {
//     return selectedLabelFilters;
// }

// // Фильтрация задач по меткам
// function filterTasksByLabels(tasks) {
//     if (selectedLabelFilters.length === 0) return tasks;
    
//     return tasks.filter(task => {
//         const taskLabels = getTaskLabelsFromStorage(task.id);
//         return selectedLabelFilters.some(filterId => taskLabels.includes(filterId));
//     });
// }

// // Хранилище меток задач (используем localStorage как временное решение)
// function getTaskLabelsFromStorage(taskId) {
//     const stored = localStorage.getItem(`task_labels_${taskId}`);
//     return stored ? JSON.parse(stored) : [];
// }

// function saveTaskLabelsToStorage(taskId, labelIds) {
//     localStorage.setItem(`task_labels_${taskId}`, JSON.stringify(labelIds));
// }

// // Назначение/удаление метки у задачи
// let isToggling = false;

// async function toggleTaskLabel(taskId, labelId, isChecked) {
//     if (isToggling) {
//         showError('⏳ Подождите, операция уже выполняется');
//         return;
//     }
    
//     isToggling = true;
    
//     try {
//         let taskLabels = getTaskLabelsFromStorage(taskId);
        
//         if (isChecked) {
//             if (!taskLabels.includes(labelId)) {
//                 taskLabels.push(labelId);
//             }
//         } else {
//             taskLabels = taskLabels.filter(id => id !== labelId);
//         }
        
//         saveTaskLabelsToStorage(taskId, taskLabels);
        
//         if (typeof loadTasks === 'function') {
//             await loadTasks();
//         }
//         showSuccess(isChecked ? '✅ Метка добавлена' : '✅ Метка убрана');
//     } catch (error) {
//         showError('❌ Ошибка при изменении меток');
//         console.error(error);
//     } finally {
//         isToggling = false;
//     }
// }

// // Получение меток задачи для отображения
// function getTaskLabelsForTask(taskId) {
//     const taskLabelIds = getTaskLabelsFromStorage(taskId);
//     return labels.filter(label => taskLabelIds.includes(label.id));
// }

// // Вспомогательные функции
// function escapeHtml(text) {
//     if (!text) return '';
//     const div = document.createElement('div');
//     div.textContent = text;
//     return div.innerHTML;
// }

// function showError(message) {
//     console.error(message);
//     alert(message);
// }

// function showSuccess(message) {
//     console.log(message);
// }

// // Загрузка меток при старте
// document.addEventListener('DOMContentLoaded', () => {
//     // Проверяем, есть ли токен
//     const token = localStorage.getItem('token');
//     if (token) {
//         loadLabels();
//     }
// });


// // frontend/labels.js

// let labels = [];
// let selectedLabelFilters = [];

// // Загрузка меток с сервера
// async function loadLabels() {
//     try {
//         const response = await fetch('/labels');
//         if (response.ok) {
//             labels = await response.json();
//         }
//     } catch (error) {
//         console.error('Failed to load labels:', error);
//     }
//     renderLabelsList();
//     renderLabelFilters();
// } 


// // ========== СОЗДАНИЕ МЕТКИ (с защитой от двойного нажатия) ==========
// let isCreatingLabel = false;

// async function createLabel() {
//     if (isCreatingLabel) {
//         showError('⏳ Подождите, метка уже создаётся');
//         return;
//     }
    
//     const name = document.getElementById('newLabelName')?.value.trim();
//     const color = document.getElementById('newLabelColor')?.value;
    
//     if (!name) {
//         showError('❌ Введите название метки');
//         return;
//     }
    
//     isCreatingLabel = true;
//     const createBtn = document.querySelector('.add-label-form button');
//     const originalText = createBtn?.innerText;
//     if (createBtn) createBtn.innerText = '⏳ Создание...';
    
//     try {
//         const response = await fetch('/labels', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ name, color })
//         });
        
//         if (!response.ok) {
//             let errorMsg = 'Ошибка создания метки';
//             try {
//                 const errData = await response.json();
//                 errorMsg = errData.error || errData.message || errorMsg;
//             } catch(e) {}
//             throw new Error(errorMsg);
//         }
        
//         const newLabel = await response.json();
//         labels.push(newLabel);
//         document.getElementById('newLabelName').value = '';
//         renderLabelsList();
//         renderLabelFilters();
//         showSuccess('✅ Метка создана');
//     } catch (error) {
//         showError('❌ Ошибка при создании метки: ' + error.message);
//     } finally {
//         isCreatingLabel = false;
//         if (createBtn) createBtn.innerText = originalText || '➕ Добавить метку';
//     }
// }

// // ========== УДАЛЕНИЕ МЕТКИ (с подтверждением) ==========
// let isDeletingLabel = false;

// async function deleteLabel(labelId) {
//     if (isDeletingLabel) {
//         showError('⏳ Подождите, удаление уже выполняется');
//         return;
//     }
    
//     // Находим название метки для красивого подтверждения
//     const label = labels.find(l => l.id === labelId);
//     if (!confirm(`Удалить метку "${label?.name || ''}"? Она отвяжется от всех задач.`)) return;
    
//     isDeletingLabel = true;
    
//     try {
//         const response = await fetch(`/labels/${labelId}`, { method: 'DELETE' });
//         if (!response.ok) throw new Error('Ошибка удаления');
        
//         labels = labels.filter(l => l.id !== labelId);
//         renderLabelsList();
//         renderLabelFilters();
//         showSuccess('✅ Метка удалена');
//     } catch (error) {
//         showError('❌ Ошибка при удалении метки: ' + error.message);
//     } finally {
//         isDeletingLabel = false;
//     }
// }

// // Создание метки
// // async function createLabel() {
// //     const name = document.getElementById('newLabelName')?.value.trim();
// //     const color = document.getElementById('newLabelColor')?.value;
    
// //     if (!name) {
// //         showError('❌ Введите название метки');
// //         return;
// //     }
    
// //     try {
// //         const response = await fetch('/labels', {
// //             method: 'POST',
// //             headers: { 'Content-Type': 'application/json' },
// //             body: JSON.stringify({ name, color })
// //         });
        
// //         if (response.ok) {
// //             const newLabel = await response.json();
// //             labels.push(newLabel);
// //             document.getElementById('newLabelName').value = '';
// //             renderLabelsList();
// //             renderLabelFilters();
// //             showSuccess('✅ Метка создана');
// //         } else {
// //             showError('❌ Ошибка при создании метки');
// //         }
// //     } catch (error) {
// //         showError('❌ Ошибка при создании метки');
// //     }
// // }

// // // Удаление метки
// // async function deleteLabel(labelId) {
// //     try {
// //         const response = await fetch(`/labels/${labelId}`, { method: 'DELETE' });
// //         if (response.ok) {
// //             labels = labels.filter(l => l.id !== labelId);
// //             renderLabelsList();
// //             renderLabelFilters();
// //             showSuccess('✅ Метка удалена');
// //         }
// //     } catch (error) {
// //         showError('❌ Ошибка при удалении метки');
// //     }
// // }

// // Отображение списка всех меток
// function renderLabelsList() {
//     const container = document.getElementById('labelsList');
//     if (!container) return;
    
//     if (labels.length === 0) {
//         container.innerHTML = '<div style="color:#999;">Нет меток. Создайте первую!</div>';
//         return;
//     }
    
//     container.innerHTML = labels.map(label => `
//         <div class="label" style="background: ${label.color};">
//             ${escapeHtml(label.name)}
//             <span class="remove-label" onclick="deleteLabel(${label.id})">✖</span>
//         </div>
//     `).join('');
// }

// // Отображение фильтров по меткам
// function renderLabelFilters() {
//     const container = document.getElementById('labelFilters');
//     if (!container) return;
    
//     if (labels.length === 0) {
//         container.innerHTML = '<div style="color:#999;">Создайте метки для фильтрации</div>';
//         return;
//     }
    
//     container.innerHTML = labels.map(label => `
//         <div class="label-filter ${selectedLabelFilters.includes(label.id) ? 'active' : ''}" 
//              style="background: ${label.color};"
//              onclick="toggleLabelFilter(${label.id})">
//             ${escapeHtml(label.name)}
//         </div>
//     `).join('');
// }

// // Переключение фильтра метки
// function toggleLabelFilter(labelId) {
//     if (selectedLabelFilters.includes(labelId)) {
//         selectedLabelFilters = selectedLabelFilters.filter(id => id !== labelId);
//     } else {
//         selectedLabelFilters.push(labelId);
//     }
//     renderLabelFilters();
//     if (typeof loadTasks === 'function') {
//         loadTasks();
//     }
// }

// // Очистка фильтра меток
// function clearLabelFilter() {
//     selectedLabelFilters = [];
//     renderLabelFilters();
//     if (typeof loadTasks === 'function') {
//         loadTasks();
//     }
// }

// // Получение текущих фильтров меток
// function getLabelFilters() {
//     return selectedLabelFilters;
// }

// // Фильтрация задач по меткам
// function filterTasksByLabels(tasks) {
//     if (selectedLabelFilters.length === 0) return tasks;
    
//     return tasks.filter(task => {
//         const taskLabels = getTaskLabelsFromStorage(task.id);
//         return selectedLabelFilters.some(filterId => taskLabels.includes(filterId));
//     });
// }

// // Временное хранилище меток задач (пока API не готов)
// function getTaskLabelsFromStorage(taskId) {
//     const stored = localStorage.getItem(`task_labels_${taskId}`);
//     return stored ? JSON.parse(stored) : [];
// }

// function saveTaskLabelsToStorage(taskId, labelIds) {
//     localStorage.setItem(`task_labels_${taskId}`, JSON.stringify(labelIds));
// }


// // ========== НАЗНАЧЕНИЕ/УДАЛЕНИЕ МЕТКИ У ЗАДАЧИ (с защитой от двойного нажатия) ==========
// let isToggling = false;

// async function toggleTaskLabel(taskId, labelId, isChecked) {
//     if (isToggling) {
//         showError('⏳ Подождите, операция уже выполняется');
//         return;
//     }
    
//     isToggling = true;
    
//     try {
//         let taskLabels = getTaskLabelsFromStorage(taskId);
        
//         if (isChecked) {
//             if (!taskLabels.includes(labelId)) {
//                 taskLabels.push(labelId);
//             }
//         } else {
//             taskLabels = taskLabels.filter(id => id !== labelId);
//         }
        
//         saveTaskLabelsToStorage(taskId, taskLabels);
        
//         if (typeof loadTasks === 'function') {
//             await loadTasks();
//         }
//         showSuccess(isChecked ? '✅ Метка добавлена' : '✅ Метка убрана');
//     } catch (error) {
//         showError('❌ Ошибка при изменении меток');
//         console.error(error);
//     } finally {
//         isToggling = false;
//     }
// }

// // // Назначение/удаление метки у задачи
// // async function toggleTaskLabel(taskId, labelId, isChecked) {
// //     let taskLabels = getTaskLabelsFromStorage(taskId);
    
// //     if (isChecked) {
// //         if (!taskLabels.includes(labelId)) {
// //             taskLabels.push(labelId);
// //         }
// //     } else {
// //         taskLabels = taskLabels.filter(id => id !== labelId);
// //     }
    
// //     saveTaskLabelsToStorage(taskId, taskLabels);
    
// //     if (typeof loadTasks === 'function') {
// //         loadTasks();
// //     }
// // }

// // Получение меток задачи для отображения
// function getTaskLabelsForTask(taskId) {
//     const taskLabelIds = getTaskLabelsFromStorage(taskId);
//     return labels.filter(label => taskLabelIds.includes(label.id));
// }

// // Загрузка меток при старте
// document.addEventListener('DOMContentLoaded', () => {
//     loadLabels();
// });