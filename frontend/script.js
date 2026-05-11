// frontend/script.js

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentTask = null;
let isLoading = false;
// ========== ПЕРЕМЕННЫЕ ДЛЯ ПАГИНАЦИИ ==========
let currentPage = 1;
let perPage = 10;
let currentSortBy = 'priority';
let currentSortOrder = 'desc';
let allTasks = [];
let searchQuery = '';

// API URL (можно вынести в .env позже)
// const API_BASE_URL = 'http://localhost:8080';
// Используем конфиг
const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

// ========== ФУНКЦИИ УВЕДОМЛЕНИЙ ==========
function showError(message) {
  let toast = document.getElementById('errorToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'errorToast';
    toast.className = 'error-toast';
    document.body.appendChild(toast);
  }
  
  toast.innerText = message;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 5000);
}

function showSuccess(message) {
  let toast = document.getElementById('successToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'successToast';
    toast.className = 'success-toast';
    document.body.appendChild(toast);
  }
  
  toast.innerText = message;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// ========== DEBOUNCE (задержка ввода) ==========
let debounceTimer;

function debounce(func, delay) {
    return function(...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
}

// ========== ОБРАБОТЧИК ПОИСКА (с debounce) ==========
function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            searchQuery = e.target.value.trim();
            currentPage = 1;   // сбрасываем на первую страницу
            applySortAndPage();
        }, 300));
    }
}

// ========== УНИВЕРСАЛЬНЫЙ FETCH С ОБРАБОТКОЙ ОШИБОК ==========
async function fetchAPI(url, options = {}) {
    // Автоматически подставляем базовый URL
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    // Таймаут (чтобы запрос не висел вечно)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
        const response = await fetch(fullUrl, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch(e) {
                errorMessage = response.statusText || errorMessage;
            }
            
            if (response.status === 401) {
                errorMessage = '❌ Unauthorized. Please login again.';
            } else if (response.status === 403) {
                errorMessage = '🔒 Access denied. You don\'t have permission.';
            } else if (response.status === 404) {
                errorMessage = '🔍 Resource not found.';
            } else if (response.status === 400) {
                errorMessage = '⚠️ Invalid request: ' + errorMessage;
            } else if (response.status === 500) {
                errorMessage = '🔥 Server error. Please try again later.';
            }
            
            throw new Error(errorMessage);
        }
        
        if (response.status === 204) {
            return null;
        }
        
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            showError('⏱️ Сервер не отвечает. Попробуйте позже');
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showError('🌐 Network error: Cannot connect to server.');
        } else {
            showError(error.message);
        }
        throw error;
    }
}


// ========== ВАЛИДАЦИЯ ЗАДАЧИ ==========
function validateTask(title, description) {
  if (!title || title.trim() === '') {
    showError('❌ Task title is required!');
    return false;
  }
  if (title.length > 200) {
    showError('❌ Task title must be less than 200 characters!');
    return false;
  }
  if (description && description.length > 2000) {
    showError('❌ Description is too long (max 2000 chars)!');
    return false;
  }
  return true;
}

async function loadTasks() {
    if (isLoading) return;
    
    isLoading = true;
    const boardDiv = document.getElementById('board');
    
    if (boardDiv) {
        boardDiv.innerHTML = '<div style="text-align:center; padding:40px;"><span class="loader"></span> Loading tasks...</div>';
    }
    
    try {
        allTasks = await fetchAPI('/tasks');
        
        // Применяем сортировку и пагинацию
        applySortAndPage();
        
    } catch (error) {
        console.error('Load tasks error:', error);
        if (boardDiv) {
            if (error.message && error.message.includes('доступ')) {
                boardDiv.innerHTML = '<div class="empty-state">🔒 У вас нет доступа к этим задачам</div>';
            } else {
                boardDiv.innerHTML = '<div class="empty-state">⚠️ Не удалось загрузить задачи. Проверьте сервер.</div>';
            }
        }
    } finally {
        isLoading = false;
    }
}

 //========== ОТРИСОВКА ДОСКИ ==========
function renderBoard(tasks) {
  const boardDiv = document.getElementById('board');
  if (!boardDiv) return;
  
  boardDiv.innerHTML = '';
  
  const columns = [1, 2, 3];
  const columnTitles = { 1: '📋 To Do', 2: '⚙️ In Progress', 3: '✅ Done' };
  const priorityEmojis = { 'high': '🔴', 'medium': '🟡', 'low': '🟢' };
  
  let hasAnyTask = false;
  
  columns.forEach(col => {
    const columnDiv = document.createElement('div');
    columnDiv.className = 'column';
    columnDiv.innerHTML = `<h3>${columnTitles[col]}</h3>`;
    
    // const tasksInColumn = tasks.filter(t => t.ColumnID === col);
    const tasksInColumn = tasks.filter(t => t.column_id === col);
    if (tasksInColumn.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.innerText = '✨ No tasks';
      columnDiv.appendChild(emptyDiv);
    } else {
      hasAnyTask = true;
      tasksInColumn.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task';
        const emoji = priorityEmojis[task.priority] || '⚪';
        
        // ===== НОВЫЙ КОД: ПОЛУЧАЕМ МЕТКИ ЗАДАЧИ =====
        let taskLabelsHtml = '';
        // Проверяем, есть ли функция getTaskLabelsForTask
        if (typeof getTaskLabelsForTask === 'function') {
            const taskLabelsList = getTaskLabelsForTask(task.id);
            if (taskLabelsList && taskLabelsList.length > 0) {
                taskLabelsHtml = '<div class="task-labels">' + 
                    taskLabelsList.map(label => 
                        `<span class="task-label" style="background: ${label.color};">${escapeHtml(label.name)}</span>`
                    ).join('') + 
                '</div>';
            }
        }
        // ===== КОНЕЦ НОВОГО КОДА =====
        
        // Собираем HTML карточки (с метками)
        taskDiv.innerHTML = `
            <div><strong>${emoji} ${escapeHtml(task.title)}</strong></div>
            ${taskLabelsHtml}
            <div style="font-size: 10px; color: #888;">👤 ${task.assigned_to || 'unassigned'}</div>
        `;
        
        taskDiv.title = `Assigned to: ${task.assigned_to || 'unassigned'}\nPriority: ${task.priority || 'medium'}`;
        taskDiv.onclick = () => openModal(task);
        columnDiv.appendChild(taskDiv);
      });
    }
    
    boardDiv.appendChild(columnDiv);
  });
  
  if (!hasAnyTask && tasks.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-state';
    emptyMsg.innerText = '📭 No tasks matching filters';
    emptyMsg.style.width = '100%';
    emptyMsg.style.textAlign = 'center';
    boardDiv.appendChild(emptyMsg);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}




// ========== МОДАЛЬНОЕ ОКНО ==========
function openModal(task) {
    currentTask = task;
    
    const titleInput = document.getElementById('editTitle');
    const descInput = document.getElementById('editDesc');
    const prioritySelect = document.getElementById('editPriority');
    const assignedInput = document.getElementById('editAssignedTo');
    
    if (titleInput) titleInput.value = task.title || '';
    if (descInput) descInput.value = task.description || '';
    if (prioritySelect) prioritySelect.value = task.priority || 'medium';
    if (assignedInput) assignedInput.value = task.assigned_to || '';
    
    // ===== ДОБАВЛЯЕМ МЕТКИ В МОДАЛЬНОЕ ОКНО =====
    const container = document.getElementById('modalTaskLabels');
    if (container && typeof labels !== 'undefined' && labels.length > 0) {
        // Получаем ID меток, которые уже есть у задачи
        let taskLabelIds = [];
        if (typeof getTaskLabelsFromStorage === 'function') {
            taskLabelIds = getTaskLabelsFromStorage(task.id);
        }
        
        container.innerHTML = labels.map(label => `
            <div class="modal-label-item">
                <label style="background: ${label.color};">
                    <input type="checkbox" value="${label.id}" 
                        ${taskLabelIds.includes(label.id) ? 'checked' : ''}
                        onchange="toggleTaskLabel(${task.id}, ${label.id}, this.checked)">
                    ${escapeHtml(label.name)}
                </label>
            </div>
        `).join('');
    } else if (container) {
        container.innerHTML = '<div style="color:#999;">Загрузка меток...</div>';
    }
    // ===== КОНЕЦ ДОБАВЛЕННОГО КОДА =====
    
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
    currentTask = null;
}




// ========== СОХРАНЕНИЕ ЗАДАЧИ (с защитой от дубляжа и проверкой изменений) ==========
let isSaving = false;

async function saveTask() {
    // Защита от двойного нажатия
    if (isSaving) {
        showError('⏳ Подождите, сохранение уже выполняется');
        return;
    }
    
    if (!currentTask) {
        showError('❌ Задача не выбрана');
        return;
    }
    
    const title = document.getElementById('editTitle')?.value || '';
    const description = document.getElementById('editDesc')?.value || '';
    const priority = document.getElementById('editPriority')?.value || 'medium';
    const assignedTo = document.getElementById('editAssignedTo')?.value;
    
    // Проверка, были ли изменения
    const hasChanges = 
        title !== (currentTask.title || '') ||
        description !== (currentTask.description || '') ||
        priority !== (currentTask.priority || 'medium') ||
        (assignedTo ? parseInt(assignedTo) : null) !== (currentTask.assigned_to || null);
    
    if (!hasChanges) {
        showError('⚠️ Нет изменений для сохранения');
        return;
    }
    
    if (!validateTask(title, description)) {
        return;
    }
    
    isSaving = true;
    // Меняем текст кнопки (если есть)
    const saveBtn = document.querySelector('#modal button:first-of-type');
    const originalText = saveBtn?.innerText;
    if (saveBtn) saveBtn.innerText = '💾 Сохранение...';
    
    const payload = {
        column_id: currentTask.column_id,
        position: currentTask.position,
        title: title,
        description: description,
        priority: priority
    };
    
    if (assignedTo && assignedTo !== '') {
        payload.assigned_to = parseInt(assignedTo);
    }
    
    try {
        await fetchAPI(`/tasks/${currentTask.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        closeModal();
        showSuccess('✅ Задача сохранена!');
        loadTasks();
    } catch (error) {
        console.error('Save error:', error);
        // Ошибка уже показана в fetchAPI
    } finally {
        isSaving = false;
        if (saveBtn) saveBtn.innerText = originalText || '💾 Save';
    }
}



// ========== ОЧИСТКА ФИЛЬТРОВ ==========
function clearFilters() {
  const priorityFilter = document.getElementById('priorityFilter');
  const userFilter = document.getElementById('userFilter');
   const searchInput = document.getElementById('searchInput');
  
  if (priorityFilter) priorityFilter.value = '';
  if (userFilter) userFilter.value = '';
   if (searchInput) searchInput.value = '';
    
    searchQuery = '';
    currentPage = 1;
  loadTasks();
}

// ========== ПРИМЕНЕНИЕ ФИЛЬТРОВ ==========
function applyFilter() {
    currentPage = 1;
    applySortAndPage();
}

// ========== ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ ДЛЯ ФИЛЬТРА ==========
async function loadUsersForFilter() {
  try {
    const users = await fetchAPI(`${API_BASE_URL}/users`);
    const userFilter = document.getElementById('userFilter');
    if (userFilter && users && users.length) {
      // Можно добавить datalist или select, но пока оставляем input
    }
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initEventListeners() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal');
      if (modal && modal.style.display === 'flex') {
        closeModal();
      }
    }
  });
  
  const modal = document.getElementById('modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal();
      }
    });
  }
}


// ========== СОРТИРОВКА ==========
function sortTasks(tasks) {
    const sortBy = document.getElementById('sortBy')?.value || currentSortBy;
    const sortOrder = document.getElementById('sortOrder')?.value || currentSortOrder;
    
    currentSortBy = sortBy;
    currentSortOrder = sortOrder;
    
    const sorted = [...tasks];
    
    sorted.sort((a, b) => {
        let valA, valB;
        
        switch(sortBy) {
            case 'priority':
                const priorityWeight = { 'high': 3, 'medium': 2, 'low': 1 };
                valA = priorityWeight[a.priority] || 0;
                valB = priorityWeight[b.priority] || 0;
                break;
            case 'created_at':
                valA = new Date(a.created_at || 0);
                valB = new Date(b.created_at || 0);
                break;
            case 'title':
                valA = (a.title || '').toLowerCase();
                valB = (b.title || '').toLowerCase();
                break;
            case 'assigned_to':
                valA = a.assigned_to || 0;
                valB = b.assigned_to || 0;
                break;
            default:
                valA = a.id || 0;
                valB = b.id || 0;
        }
        
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
    
    return sorted;
}

// ========== ПАГИНАЦИЯ ==========
function paginateTasks(tasks) {
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    return tasks.slice(start, end);
}

function updatePaginationButtons(totalTasks) {
    const totalPages = Math.ceil(totalTasks / perPage);
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    if (pageInfo) pageInfo.innerText = `Страница ${currentPage} из ${totalPages || 1}`;
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        applySortAndPage();
    }
}

function nextPage() {
    const totalPages = Math.ceil(allTasks.length / perPage);
    if (currentPage < totalPages) {
        currentPage++;
        applySortAndPage();
    }
}

function changePerPage() {
    const newPerPage = parseInt(document.getElementById('perPage')?.value || 10);
    perPage = newPerPage;
    currentPage = 1;
    applySortAndPage();
}

function applySortAndPage() {
    // Получаем текущие значения фильтров
    const priority = document.getElementById('priorityFilter')?.value;
    const userId = document.getElementById('userFilter')?.value;
    
    let filteredTasks = [...allTasks];
    
    // Применяем фильтры
    if (priority) {
        filteredTasks = filteredTasks.filter(t => t.priority === priority);
    }
    if (userId) {
        filteredTasks = filteredTasks.filter(t => t.assigned_to === parseInt(userId));
    }

    // Фильтрация по поисковому запросу (название задачи)
      if (searchQuery !== '') {
    filteredTasks = filteredTasks.filter(t => 
        t.title && t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
}
    
    // Фильтрация по меткам
    if (typeof filterTasksByLabels === 'function') {
        filteredTasks = filterTasksByLabels(filteredTasks);
    }
    
    // Сортировка
    const sortedTasks = sortTasks(filteredTasks);
    
    // Сохраняем для пагинации
    const paginatedTasks = paginateTasks(sortedTasks);
    
    // Обновляем кнопки пагинации
    updatePaginationButtons(sortedTasks.length);
    
    // Отображаем
    renderBoard(paginatedTasks);
}

// ========== АРХИВИРОВАНИЕ ЗАДАЧИ ==========
async function archiveCurrentTask() {
    if (!currentTask) {
        showError('❌ Нет выбранной задачи');
        return;
    }
    
    if (!confirm(`Переместить задачу "${currentTask.title}" в архив?`)) return;
    
    try {
        await fetchAPI(`/tasks/${currentTask.id}/archive`, { method: 'PATCH' });
        closeModal();
        showSuccess('✅ Задача перемещена в архив');
        loadTasks();          // обновляем доску (задача исчезнет)
    } catch (error) {
        console.error('Archive error:', error);
        // ошибка уже показана в fetchAPI
    }
}

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadUsersForFilter();
  loadTasks();
  setupSearchListener();
});












