// frontend/labels.js

let labels = [];
let selectedLabelFilters = [];

// Загрузка меток с сервера
async function loadLabels() {
    try {
        const response = await fetch(`${API_BASE_URL}/labels`);
        if (response.ok) {
            labels = await response.json();
        }
    } catch (error) {
        console.error('Failed to load labels:', error);
    }
    renderLabelsList();
    renderLabelFilters();
} 


// ========== СОЗДАНИЕ МЕТКИ (с защитой от двойного нажатия) ==========
let isCreatingLabel = false;

async function createLabel() {
    if (isCreatingLabel) {
        showError('⏳ Подождите, метка уже создаётся');
        return;
    }
    
    const name = document.getElementById('newLabelName')?.value.trim();
    const color = document.getElementById('newLabelColor')?.value;
    
    if (!name) {
        showError('❌ Введите название метки');
        return;
    }
    
    isCreatingLabel = true;
    const createBtn = document.querySelector('.add-label-form button');
    const originalText = createBtn?.innerText;
    if (createBtn) createBtn.innerText = '⏳ Создание...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/labels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

// ========== УДАЛЕНИЕ МЕТКИ (с подтверждением) ==========
let isDeletingLabel = false;

async function deleteLabel(labelId) {
    if (isDeletingLabel) {
        showError('⏳ Подождите, удаление уже выполняется');
        return;
    }
    
    // Находим название метки для красивого подтверждения
    const label = labels.find(l => l.id === labelId);
    if (!confirm(`Удалить метку "${label?.name || ''}"? Она отвяжется от всех задач.`)) return;
    
    isDeletingLabel = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/labels/${labelId}`, { method: 'DELETE' });
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

// Создание метки
// async function createLabel() {
//     const name = document.getElementById('newLabelName')?.value.trim();
//     const color = document.getElementById('newLabelColor')?.value;
    
//     if (!name) {
//         showError('❌ Введите название метки');
//         return;
//     }
    
//     try {
//         const response = await fetch('/labels', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ name, color })
//         });
        
//         if (response.ok) {
//             const newLabel = await response.json();
//             labels.push(newLabel);
//             document.getElementById('newLabelName').value = '';
//             renderLabelsList();
//             renderLabelFilters();
//             showSuccess('✅ Метка создана');
//         } else {
//             showError('❌ Ошибка при создании метки');
//         }
//     } catch (error) {
//         showError('❌ Ошибка при создании метки');
//     }
// }

// // Удаление метки
// async function deleteLabel(labelId) {
//     try {
//         const response = await fetch(`/labels/${labelId}`, { method: 'DELETE' });
//         if (response.ok) {
//             labels = labels.filter(l => l.id !== labelId);
//             renderLabelsList();
//             renderLabelFilters();
//             showSuccess('✅ Метка удалена');
//         }
//     } catch (error) {
//         showError('❌ Ошибка при удалении метки');
//     }
// }

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

// Фильтрация задач по меткам
function filterTasksByLabels(tasks) {
    if (selectedLabelFilters.length === 0) return tasks;
    
    return tasks.filter(task => {
        const taskLabels = getTaskLabelsFromStorage(task.id);
        return selectedLabelFilters.some(filterId => taskLabels.includes(filterId));
    });
}

// Временное хранилище меток задач (пока API не готов)
function getTaskLabelsFromStorage(taskId) {
    const stored = localStorage.getItem(`task_labels_${taskId}`);
    return stored ? JSON.parse(stored) : [];
}

function saveTaskLabelsToStorage(taskId, labelIds) {
    localStorage.setItem(`task_labels_${taskId}`, JSON.stringify(labelIds));
}


// ========== НАЗНАЧЕНИЕ/УДАЛЕНИЕ МЕТКИ У ЗАДАЧИ (с защитой от двойного нажатия) ==========
let isToggling = false;

async function toggleTaskLabel(taskId, labelId, isChecked) {
    if (isToggling) {
        showError('⏳ Подождите, операция уже выполняется');
        return;
    }
    
    isToggling = true;
    
    try {
        let taskLabels = getTaskLabelsFromStorage(taskId);
        
        if (isChecked) {
            if (!taskLabels.includes(labelId)) {
                taskLabels.push(labelId);
            }
        } else {
            taskLabels = taskLabels.filter(id => id !== labelId);
        }
        
        saveTaskLabelsToStorage(taskId, taskLabels);
        
        if (typeof loadTasks === 'function') {
            await loadTasks();
        }
        showSuccess(isChecked ? '✅ Метка добавлена' : '✅ Метка убрана');
    } catch (error) {
        showError('❌ Ошибка при изменении меток');
        console.error(error);
    } finally {
        isToggling = false;
    }
}

// // Назначение/удаление метки у задачи
// async function toggleTaskLabel(taskId, labelId, isChecked) {
//     let taskLabels = getTaskLabelsFromStorage(taskId);
    
//     if (isChecked) {
//         if (!taskLabels.includes(labelId)) {
//             taskLabels.push(labelId);
//         }
//     } else {
//         taskLabels = taskLabels.filter(id => id !== labelId);
//     }
    
//     saveTaskLabelsToStorage(taskId, taskLabels);
    
//     if (typeof loadTasks === 'function') {
//         loadTasks();
//     }
// }

// Получение меток задачи для отображения
function getTaskLabelsForTask(taskId) {
    const taskLabelIds = getTaskLabelsFromStorage(taskId);
    return labels.filter(label => taskLabelIds.includes(label.id));
}

// Загрузка меток при старте
document.addEventListener('DOMContentLoaded', () => {
    loadLabels();
});