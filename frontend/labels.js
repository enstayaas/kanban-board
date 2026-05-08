// frontend/labels.js

let labels = [];
let selectedLabelFilters = [];

// Загрузка меток с сервера
async function loadLabels() {
    try {
        const response = await fetch('/labels');
        if (response.ok) {
            labels = await response.json();
        }
    } catch (error) {
        console.error('Failed to load labels:', error);
    }
    renderLabelsList();
    renderLabelFilters();
}

// Создание метки
async function createLabel() {
    const name = document.getElementById('newLabelName')?.value.trim();
    const color = document.getElementById('newLabelColor')?.value;
    
    if (!name) {
        showError('❌ Введите название метки');
        return;
    }
    
    try {
        const response = await fetch('/labels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color })
        });
        
        if (response.ok) {
            const newLabel = await response.json();
            labels.push(newLabel);
            document.getElementById('newLabelName').value = '';
            renderLabelsList();
            renderLabelFilters();
            showSuccess('✅ Метка создана');
        } else {
            showError('❌ Ошибка при создании метки');
        }
    } catch (error) {
        showError('❌ Ошибка при создании метки');
    }
}

// Удаление метки
async function deleteLabel(labelId) {
    try {
        const response = await fetch(`/labels/${labelId}`, { method: 'DELETE' });
        if (response.ok) {
            labels = labels.filter(l => l.id !== labelId);
            renderLabelsList();
            renderLabelFilters();
            showSuccess('✅ Метка удалена');
        }
    } catch (error) {
        showError('❌ Ошибка при удалении метки');
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

// Фильтрация задач по меткам
function filterTasksByLabels(tasks) {
    if (selectedLabelFilters.length === 0) return tasks;
    
    return tasks.filter(task => {
        const taskLabels = getTaskLabelsFromStorage(task.ID);
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

// Назначение/удаление метки у задачи
async function toggleTaskLabel(taskId, labelId, isChecked) {
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
        loadTasks();
    }
}

// Получение меток задачи для отображения
function getTaskLabelsForTask(taskId) {
    const taskLabelIds = getTaskLabelsFromStorage(taskId);
    return labels.filter(label => taskLabelIds.includes(label.id));
}

// Загрузка меток при старте
document.addEventListener('DOMContentLoaded', () => {
    loadLabels();
});