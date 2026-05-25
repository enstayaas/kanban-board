// frontend/users.js

const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

async function fetchAPI(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetch(fullUrl, options);
    if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
            const err = await response.json();
            errorMsg = err.error || err.message || errorMsg;
        } catch(e) {}
        throw new Error(errorMsg);
    }
    return response.json();
}

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    // Показать загрузчик
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;"><div class="loader"></div> Загрузка...</td></tr>';
    
    try {
        const users = await fetchAPI('/users');
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-state">👥 Нет пользователей</td></tr>';
        } else {
            renderUsers(users);
        }
    } catch (error) {
        console.error('Load users error:', error);
        tbody.innerHTML = `<tr><td colspan="3" class="empty-state" style="color:red;">⚠️ Ошибка загрузки: ${error.message}</td></tr>`;
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    users.forEach(user => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = user.id || user.ID;
        row.insertCell(1).innerText = user.name || user.Name;
        row.insertCell(2).innerText = user.email || user.Email;
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

document.addEventListener('DOMContentLoaded', loadUsers);











// // frontend/users.js

// const API_BASE_URL = 'http://localhost:8080';

// async function fetchAPI(url, options = {}) {
//   const response = await fetch(url, options);
//   if (!response.ok) {
//     const error = await response.json().catch(() => ({ error: 'Request failed' }));
//     throw new Error(error.error || `HTTP ${response.status}`);
//   }
//   return response.json();
// }

// async function loadUsers() {
//   const tbody = document.getElementById('usersTableBody');
//   if (tbody) {
//     tbody.innerHTML = '<tr><td colspan="3"><div class="loader"></div> Loading...</td></tr>';
//   }
  
//   try {
//     // const users = await fetchAPI(`${API_BASE_URL}/users`);
//     const users = await fetchAPI('/users');
//     renderUsers(users);
//   } catch (error) {
//     console.error('Load users error:', error);
//     if (tbody) {
//       tbody.innerHTML = '<tr><td colspan="3" style="color:red;">🔒Failed to load users</td></tr>';
//     }
//   }
// }

// function renderUsers(users) {
//   const tbody = document.getElementById('usersTableBody');
//   if (!tbody) return;
  
//   tbody.innerHTML = '';
  
//   if (!users || users.length === 0) {
//     tbody.innerHTML = '<tr><td colspan="3">No users found</td></tr>';
//     return;
//   }
  
//   users.forEach(user => {
//     const row = tbody.insertRow();
//     row.insertCell(0).innerText = user.id || user.ID;
//     row.insertCell(1).innerText = user.name || user.Name;
//     row.insertCell(2).innerText = user.email || user.Email;
//   });
// }

// document.addEventListener('DOMContentLoaded', loadUsers);








// async function loadUsers() {
//   console.log("users.js работает");

//   const errorDiv = document.getElementById("error");
//   errorDiv.innerText = ""; // очистка

//   try {
//     const res = await fetch("http://localhost:8080/users");

//     if (!res.ok) {
//       throw new Error("Ошибка загрузки пользователей");
//     }

//     const users = await res.json();

//     const container = document.getElementById("usersList");
//     container.innerHTML = "";

//     users.forEach(user => {
//       const div = document.createElement("div");
//       div.className = "user-card";

//       div.innerHTML = `
//         <h3>${user.name}</h3>
//         <p>${user.email}</p>
//         <button onclick="viewUser(${user.id})">View Profile</button>
//       `;

//       container.appendChild(div);
//     });

//   } catch (err) {
//     errorDiv.innerText = err.message;
//   }
// }


















// async function loadUsers() {
//   console.log("users.js работает");
//   const res = await fetch("http://localhost:8080/users");
//   const users = await res.json();

//   const container = document.getElementById("usersList");
//   container.innerHTML = "";

//   users.forEach(user => {
//     const div = document.createElement("div");
//     div.className = "user-card";

//     div.innerHTML = `
//       <h3>${user.name}</h3>
//       <p>${user.email}</p>
//       <button onclick="viewUser(${user.id})">View Profile</button>
//     `;

//     container.appendChild(div);
//   });
// }

// function viewUser(id) {
//   window.location.href = `profile.html?id=${id}`;
// }

// loadUsers();
