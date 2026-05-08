// frontend/script.js

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentTask = null;
let isLoading = false;

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

// ========== УНИВЕРСАЛЬНЫЙ FETCH С ОБРАБОТКОЙ ОШИБОК ==========
// async function fetchAPI(url, options = {}) {
//   try {
//     const response = await fetch(url, options);
    
//     if (!response.ok) {
//       let errorMessage = `HTTP ${response.status}`;
//       try {
//         const errorData = await response.json();
//         errorMessage = errorData.error || errorData.message || errorMessage;
//       } catch(e) {
//         errorMessage = response.statusText || errorMessage;
//       }
      
//       if (response.status === 401) {
//         errorMessage = '❌ Unauthorized. Please login again.';
//       } else if (response.status === 403) {
//         errorMessage = '🔒 Access denied. You don\'t have permission.';
//       } else if (response.status === 404) {
//         errorMessage = '🔍 Resource not found.';
//       } else if (response.status === 400) {
//         errorMessage = '⚠️ Invalid request: ' + errorMessage;
//       } else if (response.status === 500) {
//         errorMessage = '🔥 Server error. Please try again later.';
//       }
      
//       throw new Error(errorMessage);
//     }
    
//     if (response.status === 204) {
//       return null;
//     }
    
//     return await response.json();
//   } catch (error) {
//     if (error.name === 'TypeError' && error.message.includes('fetch')) {
//       showError('🌐 Network error: Cannot connect to server.');
//     } else {
//       showError(error.message);
//     }
//     throw error;
//   }
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

// ========== ЗАГРУЗКА ЗАДАЧ ==========
async function loadTasks() {
  if (isLoading) return;
  
  isLoading = true;
  const boardDiv = document.getElementById('board');
  
  if (boardDiv) {
    boardDiv.innerHTML = '<div style="text-align:center; padding:40px;"><span class="loader"></span> Loading tasks...</div>';
  }
  
  try {
    // const tasks = await fetchAPI(`${API_BASE_URL}/tasks`);
    const tasks = await fetchAPI('/tasks');
    
    let filteredTasks = tasks || [];
    const priority = document.getElementById('priorityFilter')?.value;
    const userId = document.getElementById('userFilter')?.value;
    
    if (priority) {
      filteredTasks = filteredTasks.filter(t => t.Priority === priority);
    }
    if (userId) {
      filteredTasks = filteredTasks.filter(t => t.AssignedTo === parseInt(userId));
    }

    // Фильтрация по меткам
if (typeof filterTasksByLabels === 'function') {
    filteredTasks = filterTasksByLabels(filteredTasks);
}

    
    renderBoard(filteredTasks);
  } catch (error) {
    console.error('Load tasks error:', error);
    if (boardDiv) {
      if (error.message && error.message.includes('доступ')) {
    boardDiv.innerHTML = '<div class="empty-state">🔒 У вас нет доступа к этим задачам</div>';
} else {
    boardDiv.innerHTML = '<div class="empty-state">⚠️ Не удалось загрузить задачи. Проверьте сервер.</div>';
}
      // boardDiv.innerHTML = '<div class="empty-state">⚠️ Failed to load tasks. Check console.</div>';
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
        const emoji = priorityEmojis[task.piority] || '⚪';
        
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
            <div style="font-size: 10px; color: #888;">👤 ${task.AssignedTo || 'unassigned'}</div>
        `;
        
        taskDiv.title = `Assigned to: ${task.AssignedTo || 'unassigned'}\nPriority: ${task.priority || 'medium'}`;
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

// ========== ОТРИСОВКА ДОСКИ ==========
// function renderBoard(tasks) {
//   const boardDiv = document.getElementById('board');
//   if (!boardDiv) return;
  
//   boardDiv.innerHTML = '';
  
//   const columns = [1, 2, 3];
//   const columnTitles = { 1: '📋 To Do', 2: '⚙️ In Progress', 3: '✅ Done' };
//   const priorityEmojis = { 'high': '🔴', 'medium': '🟡', 'low': '🟢' };
  
//   let hasAnyTask = false;
  
//   columns.forEach(col => {
//     const columnDiv = document.createElement('div');
//     columnDiv.className = 'column';
//     columnDiv.innerHTML = `<h3>${columnTitles[col]}</h3>`;
    
//     const tasksInColumn = tasks.filter(t => t.ColumnID === col);
    
//     if (tasksInColumn.length === 0) {
//       const emptyDiv = document.createElement('div');
//       emptyDiv.className = 'empty-state';
//       emptyDiv.innerText = '✨ No tasks';
//       columnDiv.appendChild(emptyDiv);
//     } else {
//       hasAnyTask = true;
//       tasksInColumn.forEach(task => {
//         const taskDiv = document.createElement('div');
//         taskDiv.className = 'task';
//         const emoji = priorityEmojis[task.Priority] || '⚪';
//         taskDiv.innerHTML = `${emoji} <strong>${escapeHtml(task.Title)}</strong>`;
//         taskDiv.title = `Assigned to: ${task.AssignedTo || 'unassigned'}\nPriority: ${task.Priority || 'medium'}`;
//         taskDiv.onclick = () => openModal(task);
//         columnDiv.appendChild(taskDiv);
//       });
//     }
    
//     boardDiv.appendChild(columnDiv);
//   });
  
//   if (!hasAnyTask && tasks.length === 0) {
//     const emptyMsg = document.createElement('div');
//     emptyMsg.className = 'empty-state';
//     emptyMsg.innerText = '📭 No tasks matching filters';
//     emptyMsg.style.width = '100%';
//     emptyMsg.style.textAlign = 'center';
//     boardDiv.appendChild(emptyMsg);
//   }
// }

// function escapeHtml(str) {
//   if (!str) return '';
//   return str
//     .replace(/&/g, '&amp;')
//     .replace(/</g, '&lt;')
//     .replace(/>/g, '&gt;')
//     .replace(/"/g, '&quot;')
//     .replace(/'/g, '&#39;');
// }


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

// // ========== МОДАЛЬНОЕ ОКНО ==========
// function openModal(task) {
//   currentTask = task;
  
//   const titleInput = document.getElementById('editTitle');
//   const descInput = document.getElementById('editDesc');
//   const prioritySelect = document.getElementById('editPriority');
//   const assignedInput = document.getElementById('editAssignedTo');
  
//   if (titleInput) titleInput.value = task.Title || '';
//   if (descInput) descInput.value = task.Description || '';
//   if (prioritySelect) prioritySelect.value = task.Priority || 'medium';
//   if (assignedInput) assignedInput.value = task.AssignedTo || '';
  
//   const modal = document.getElementById('modal');
//   if (modal) modal.style.display = 'flex';
// }

// function closeModal() {
//   const modal = document.getElementById('modal');
//   if (modal) modal.style.display = 'none';
//   currentTask = null;
// }

// ========== СОХРАНЕНИЕ ЗАДАЧИ ==========
async function saveTask() {
  if (!currentTask) {
    showError('❌ No task selected');
    return;
  }
  
  const title = document.getElementById('editTitle')?.value || '';
  const description = document.getElementById('editDesc')?.value || '';
  const priority = document.getElementById('editPriority')?.value || 'medium';
  const assignedTo = document.getElementById('editAssignedTo')?.value;
  
  if (!validateTask(title, description)) {
    return;
  }
  
  const payload = {
    // column_id: currentTask.ColumnID,
    column_id: currentTask.column_id,
    position: currentTask.Position,
    title: title,
    description: description,
    priority: priority
  };
  
  if (assignedTo && assignedTo !== '') {
    payload.assigned_to = parseInt(assignedTo);
  }
  
  try {
    await fetchAPI(`${API_BASE_URL}/tasks/${currentTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    closeModal();
    showSuccess('✅ Task saved successfully!');
    loadTasks();
  } catch (error) {
    console.error('Save error:', error);
  }
}

// ========== ОЧИСТКА ФИЛЬТРОВ ==========
function clearFilters() {
  const priorityFilter = document.getElementById('priorityFilter');
  const userFilter = document.getElementById('userFilter');
  
  if (priorityFilter) priorityFilter.value = '';
  if (userFilter) userFilter.value = '';
  loadTasks();
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

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadUsersForFilter();
  loadTasks();
});











// let currentTask = null;

// async function loadTasks() {
//   const errorDiv = document.getElementById("error");
//   errorDiv.innerText = ""; // очистка

//   try {
//     const res = await fetch("http://localhost:8080/tasks");
//     if (!res.ok) {
//       throw new Error("Ошибка загрузки задач");
//     }

//     let tasks = await res.json();

//     const board = document.getElementById("board");
//     board.innerHTML = "";

//     const columns = [1,2,3];

//     columns.forEach(col => {
//       const columnDiv = document.createElement("div");
//       columnDiv.className = "column";
//       columnDiv.innerHTML = `<h3>Column ${col}</h3>`;

//       tasks.filter(t => t.column_id === col)
//         .forEach(task => {
//           const taskDiv = document.createElement("div");
//           taskDiv.className = "task";
//           taskDiv.innerText = task.title;

//           columnDiv.appendChild(taskDiv);
//         });

//       board.appendChild(columnDiv);
//     });

//   } catch (err) {
//     errorDiv.innerText = err.message;
//   }
// }
// async function loadTasks() {
//   const res = await fetch("http://localhost:8080/tasks");
//   let tasks = await res.json();

//   const priority = document.getElementById("priorityFilter").value;
//   const userId = document.getElementById("userFilter").value;

//   if (priority) {
//     tasks = tasks.filter(t => t.Priority === priority);
//   }

//   if (userId) {
//     tasks = tasks.filter(t => t.AssignedTo == userId);
//   }

//   const board = document.getElementById("board");
//   board.innerHTML = "";

//   const columns = [1,2,3];

//   columns.forEach(col => {
//     const columnDiv = document.createElement("div");
//     columnDiv.className = "column";
//     columnDiv.innerHTML = `<h3>Column ${col}</h3>`;

//     tasks
//       .filter(t => t.ColumnID === col)
//       .forEach(task => {
//         const taskDiv = document.createElement("div");
//         taskDiv.className = "task";
//         taskDiv.innerText = task.Title;

//         taskDiv.onclick = () => openModal(task);

//         columnDiv.appendChild(taskDiv);
//       });

//     board.appendChild(columnDiv);
//   });
// }

// function openModal(task) {
//   currentTask = task;

//   document.getElementById("modal").style.display = "block";
//   document.getElementById("editTitle").value = task.Title;
//   document.getElementById("editDesc").value = task.Description || "";
// }

// function closeModal() {
//   document.getElementById("modal").style.display = "none";
// }

// async function saveTask() {
//   const errorDiv = document.getElementById("error");
//   errorDiv.innerText = ""; // очистка ошибки

//   const title = document.getElementById("editTitle").value;
//   const desc = document.getElementById("editDesc").value;

//   try {
//     const res = await fetch(`http://localhost:8080/tasks/${currentTask.ID}`, {
//       method: "PATCH",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         column_id: currentTask.ColumnID,
//         position: currentTask.Position,
//         title: title,
//         description: desc
//       })
//     });

//     if (!res.ok) {
//       throw new Error("Ошибка обновления задачи");
//     }

//     closeModal();
//     loadTasks();

//   } catch (err) {
//     errorDiv.innerText = err.message;
//   }
// }


// async function saveTask() {
//   const title = document.getElementById("editTitle").value;
//   const desc = document.getElementById("editDesc").value;

//   await fetch(`http://localhost:8080/tasks/${currentTask.ID}`, {
//     method: "PATCH",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       column_id: currentTask.ColumnID,
//       position: currentTask.Position,
//       title: title,
//       description: desc
//     })
//   });

//   closeModal();
//   loadTasks();
// }

// loadTasks();