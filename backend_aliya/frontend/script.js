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


async function fetchAPI(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
        const response = await fetch(fullUrl, {
            ...options,
            headers: headers,
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            throw new Error('❌ Сессия истекла. Пожалуйста, войдите снова.');
        }
        
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch(e) {
                errorMessage = response.statusText || errorMessage;
            }
            
            if (response.status === 403) {
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


// ========== УНИВЕРСАЛЬНЫЙ FETCH С ОБРАБОТКОЙ ОШИБОК ==========
// async function fetchAPI(url, options = {}) {
//     // Автоматически подставляем базовый URL
//     const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
//     // Таймаут (чтобы запрос не висел вечно)
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 10000);
    
//     try {
//         const response = await fetch(fullUrl, {
//             ...options,
//             headers: {
//                 'Content-Type': 'application/json',
//                 ...options.headers,
//             },
//             signal: controller.signal,
//         });
        
//         clearTimeout(timeoutId);
        
//         if (!response.ok) {
//             let errorMessage = `HTTP ${response.status}`;
//             try {
//                 const errorData = await response.json();
//                 errorMessage = errorData.error || errorData.message || errorMessage;
//             } catch(e) {
//                 errorMessage = response.statusText || errorMessage;
//             }
            
//             if (response.status === 401) {
//                 errorMessage = '❌ Unauthorized. Please login again.';
//             } else if (response.status === 403) {
//                 errorMessage = '🔒 Access denied. You don\'t have permission.';
//             } else if (response.status === 404) {
//                 errorMessage = '🔍 Resource not found.';
//             } else if (response.status === 400) {
//                 errorMessage = '⚠️ Invalid request: ' + errorMessage;
//             } else if (response.status === 500) {
//                 errorMessage = '🔥 Server error. Please try again later.';
//             }
            
//             throw new Error(errorMessage);
//         }
        
//         if (response.status === 204) {
//             return null;
//         }
        
//         return await response.json();
//     } catch (error) {
//         clearTimeout(timeoutId);
        
//         if (error.name === 'AbortError') {
//             showError('⏱️ Сервер не отвечает. Попробуйте позже');
//         } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
//             showError('🌐 Network error: Cannot connect to server.');
//         } else {
//             showError(error.message);
//         }
//         throw error;
//     }
// }


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
         allTasks = [];  // сбросить, чтобы не показывать старые данные

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
//   const columnTitles = { 1: '📋 To Do', 2: '⚙️ In Progress', 3: '✅ Done' };
const columnTitles = {
    1: '<i class="fa-regular fa-rectangle-list"></i> To Do',
    2: '<i class="fa-solid fa-gear"></i> In Progress',
    3: '<i class="fa-regular fa-circle-check"></i> Done'
};
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
        <div>${priorityEmojis[task.priority] || '⚪'} <strong>${escapeHtml(task.title)}</strong></div>
    ${taskLabelsHtml}
    <div style="font-size: 10px; color: #888;"><i class="fa-regular fa-user"></i> ${getUserName(task.assigned_to)}</div>
`;
        // taskDiv.innerHTML = `
        //     <div><strong>${emoji} ${escapeHtml(task.title)}</strong></div>
        //     ${taskLabelsHtml}
        
        //     <div style="font-size: 10px; color: #888;">👤 ${getUserName(task.assigned_to)}</div>
        // `;
        
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


// ========== МОДАЛЬНОЕ ОКНО ДЛЯ СОЗДАНИЯ ==========
// function openCreateModal() {
//     // Очищаем поля
//     document.getElementById('createTitle').value = '';
//     document.getElementById('createDesc').value = '';
//     document.getElementById('createPriority').value = 'medium';
//     document.getElementById('createAssignedTo').value = '';
//     document.getElementById('createColumnId').value = '1';
    
//     document.getElementById('createModal').style.display = 'flex';
// }

function openCreateModal() {
    // Очистить поля
    document.getElementById('createTitle').value = '';
    document.getElementById('createDesc').value = '';
    document.getElementById('createPriority').value = 'medium';
    document.getElementById('createAssignedTo').value = '';
    document.getElementById('createColumnId').value = '1';
    const modal = document.getElementById('createModal');
    if (modal) modal.style.display = 'flex';
}

function closeCreateModal() {
    const modal = document.getElementById('createModal');
    if (modal) modal.style.display = 'none';
}
// function closeCreateModal() {
//     document.getElementById('createModal').style.display = 'none';
// }

async function createTask() {
    const title = document.getElementById('createTitle').value.trim();
    const description = document.getElementById('createDesc').value.trim();
    const priority = document.getElementById('createPriority').value;
    const assignedTo = document.getElementById('createAssignedTo').value;
    const columnId = parseInt(document.getElementById('createColumnId').value);
    
    if (!title) {
        showError('❌ Введите название задачи');
        return;
    }
    
    // Получаем текущего пользователя (пока временно 1, потом из JWT)
    const createdBy = 1;
    
    const payload = {
        board_id: 1,
        column_id: columnId,
        title: title,
        description: description,
        priority: priority,
        created_by: createdBy,
        assigned_to: assignedTo ? parseInt(assignedTo) : 0,
        position: 0 // сервер сам проставит
    };
    
    try {
        await fetchAPI('/tasks', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        closeCreateModal();
        showSuccess('✅ Задача создана');
        loadTasks(); // обновляем доску
    } catch (error) {
        console.error('Create error:', error);
        // ошибка уже показана в fetchAPI
    }
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



function clearFilters() {
    // Сбрасываем значения фильтров
    const priorityFilter = document.getElementById('priorityFilter');
    const userFilter = document.getElementById('userFilter');
    const searchInput = document.getElementById('searchInput');
    
    if (priorityFilter) priorityFilter.value = '';
    if (userFilter) userFilter.value = '';
    if (searchInput) searchInput.value = '';
    
    // Сбрасываем переменную поиска
    searchQuery = '';
    
    // Сбрасываем страницу
    currentPage = 1;
    
    // Перезагружаем задачи (без фильтров)
    loadTasks();
}

// ========== ОЧИСТКА ФИЛЬТРОВ ==========
// function clearFilters() {
//   const priorityFilter = document.getElementById('priorityFilter');
//   const userFilter = document.getElementById('userFilter');
//    const searchInput = document.getElementById('searchInput');
  
//   if (priorityFilter) priorityFilter.value = '';
//   if (userFilter) userFilter.value = '';
//    if (searchInput) searchInput.value = '';
    
//     searchQuery = '';
//     currentPage = 1;
//   loadTasks();
// }

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

       const createModal = document.getElementById('createModal');
            if (createModal && createModal.style.display === 'flex') {
                closeCreateModal();
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

const createModal = document.getElementById('createModal');
if (createModal) {
    createModal.addEventListener('click', function(e) {
        if (e.target === this) closeCreateModal();
    });
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

// ===== НЕЖНЫЕ ЦВЕТА ДЛЯ КАРТОЧЕК =====
const pastelColors = [
    'pastel-pink', 'pastel-blue', 'pastel-yellow',
    'pastel-purple', 'pastel-green', 'pastel-orange',
    'pastel-mint', 'pastel-lavender', 'pastel-peach', 'pastel-sky'
];

function applyTaskColors() {
    document.querySelectorAll('.task').forEach((card, index) => {
        const colorIndex = index % pastelColors.length;
        card.classList.add(pastelColors[colorIndex]);
    });
}

// Наблюдатель за появлением новых карточек
const colorObserver = new MutationObserver(() => {
    const tasks = document.querySelectorAll('.task');
    if (tasks.length > 0) {
        tasks.forEach(card => {
            // Добавляем цвет, только если его ещё нет
            let hasColor = false;
            for (const color of pastelColors) {
                if (card.classList.contains(color)) {
                    hasColor = true;
                    break;
                }
            }
            if (!hasColor) {
                applyTaskColors();
            }
        });
    }
});
colorObserver.observe(document.body, { childList: true, subtree: true });


// const savedTheme = localStorage.getItem('theme');
// if (savedTheme === 'light') {
//     document.body.classList.remove('dark');
//     document.body.classList.add('light');
//     themeToggle.textContent = '🌙 Тёмная тема';
// } else {
//     document.body.classList.add('dark');
//     document.body.classList.remove('light');
//     themeToggle.textContent = '☀️ Светлая тема';
// }
// Применение сохранённой темы при загрузке
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.remove('dark');
    document.body.classList.add('light');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = '🌙 Тёмная тема';
} else {
    document.body.classList.add('dark');
    document.body.classList.remove('light');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = '☀️ Светлая тема';
}

const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        document.body.classList.toggle('light');
        const isDark = document.body.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggle.textContent = isDark ? '☀️ Светлая тема' : '🌙 Тёмная тема';
    });
}

// themeToggle.addEventListener('click', () => {
//     if (document.body.classList.contains('dark')) {
//         document.body.classList.remove('dark');
//         document.body.classList.add('light');
//         localStorage.setItem('theme', 'light');
//         themeToggle.textContent = '🌙 Тёмная тема';
//     } else {
//         document.body.classList.remove('light');
//         document.body.classList.add('dark');
//         localStorage.setItem('theme', 'dark');
//         themeToggle.textContent = '☀️ Светлая тема';
//     }
// });

// // ===== ТЁМНАЯ ТЕМА =====
// const themeToggle = document.getElementById('themeToggle');

// // Загружаем сохранённую тему
// const savedTheme = localStorage.getItem('theme');
// if (savedTheme === 'dark') {
//     document.body.classList.add('dark');
//     if (themeToggle) themeToggle.textContent = '☀️ Светлая тема';
// }

// // Переключатель темы
// if (themeToggle) {
//     themeToggle.addEventListener('click', () => {
//         document.body.classList.toggle('dark');
//         if (document.body.classList.contains('dark')) {
//             localStorage.setItem('theme', 'dark');
//             themeToggle.textContent = '☀️ Светлая тема';
//         } else {
//             localStorage.setItem('theme', 'light');
//             themeToggle.textContent = '🌙 Тёмная тема';
//         }
//     });
// }


// ===== СПИСОК ПОЛЬЗОВАТЕЛЕЙ ДЛЯ ОТОБРАЖЕНИЯ ИМЁН =====
const usersList = {
    1: { name: "Анна Смирнова", avatar: "АС" },
    2: { name: "Борис Петров", avatar: "БП" },
    3: { name: "Виктор Сидоров", avatar: "ВС" },
    4: { name: "Дарья Кузнецова", avatar: "ДК" },
    5: { name: "Елена Морозова", avatar: "ЕМ" },
    6: { name: "Максим Иванов", avatar: "МИ" },
    7: { name: "Ольга Соколова", avatar: "ОС" },
    8: { name: "Игорь Васильев", avatar: "ИВ" }
};

function getUserName(userId) {
    if (!userId || userId === 0) return "Не назначен";
    return usersList[userId]?.name || `Пользователь ${userId}`;
}

function getUserAvatar(userId) {
    if (!userId || userId === 0) return "👤";
    return usersList[userId]?.avatar || userId;
}


// ===== АВТОРИЗАЦИЯ =====
// async function login(email, password) {
//     try {
//         const response = await fetchAPI('/login', {
//             method: 'POST',
//             body: JSON.stringify({ email, password })
//         });
        
//         if (response.token) {
//             localStorage.setItem('token', response.token);
//             localStorage.setItem('user', JSON.stringify(response.user));
//             showSuccess('✅ Вход выполнен!');
//             window.location.href = 'index.html';
//         } else {
//             showError('❌ Ошибка входа: неверный email или пароль');
//         }
//     } catch (error) {
//         showError('❌ Ошибка входа: ' + error.message);
//     }
// }

// async function register(name, email, password) {
//     try {
//         const response = await fetchAPI('/register', {
//             method: 'POST',
//             body: JSON.stringify({ name, email, password })
//         });
        
//         if (response.id) {
//             showSuccess('✅ Регистрация успешна! Теперь войдите.');
//             window.location.href = 'login.html';
//         } else {
//             showError('❌ Ошибка регистрации');
//         }
//     } catch (error) {
//         showError('❌ Ошибка регистрации: ' + error.message);
//     }
// }

// function logout() {
//     localStorage.removeItem('token');
//     localStorage.removeItem('user');
//     window.location.href = 'login.html';
// }

// // Проверка авторизации при загрузке
// function checkAuth() {
//     const token = localStorage.getItem('token');
//     const publicPages = ['login.html', 'register.html'];
//     const currentPage = window.location.pathname.split('/').pop();
    
//     if (!token && !publicPages.includes(currentPage)) {
//         window.location.href = 'login.html';
//     }
// }

// Вызвать checkAuth() при загрузке каждой страницы

// // Проверка авторизации
// if (typeof checkAuth === 'function') {
//     checkAuth();
// }


// ========== ДОСКИ ==========
let currentBoardId = localStorage.getItem('currentBoardId') || 1;

async function loadBoards() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const response = await fetch('/boards', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const boards = await response.json();
            renderBoardsList(boards);
        }
    } catch (error) {
        console.error('Error loading boards:', error);
    }
}

function renderBoardsList(boards) {
    const boardList = document.getElementById('board-list');
    if (!boardList) return;
    boardList.innerHTML = boards.map(board => `
        <div class="board-item" data-id="${board.id}" onclick="switchBoard(${board.id})">
            <strong>${escapeHtml(board.title)}</strong>
        </div>
    `).join('');
}

async function switchBoard(boardId) {
    currentBoardId = boardId;
    localStorage.setItem('currentBoardId', boardId);
    await loadTasks();
}

async function createBoard(title, description = '') {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const response = await fetch('/boards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, description })
        });
        if (response.ok) {
            await loadBoards();
            return await response.json();
        }
    } catch (error) {
        console.error('Error creating board:', error);
    }
}

function showCreateBoardModal() {
    const title = prompt('Введите название доски:');
    if (title) createBoard(title);
}

// // Загружаем доски при старте
// if (typeof checkAuth === 'function') {
//     loadBoards();
// }

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadUsersForFilter();
  loadTasks();
  setupSearchListener();
});










