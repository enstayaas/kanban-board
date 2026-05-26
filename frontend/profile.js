// frontend/profile.js
// frontend/profile.js

// frontend/profile.js

// frontend/profile.js
// frontend/profile.js
// frontend/profile.js

// frontend/profile.js

const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8081';

async function loadProfile() {
    const msg = document.getElementById('profileMessage');
    try {
        const response = await fetch(`${API_BASE_URL}/users/1`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const user = await response.json();
        
        const userName = user.name || user.Name;
        const userEmail = user.email || user.Email;
        
        // Обновляем отображение
        document.getElementById('profileId').innerText = 1;
        document.getElementById('profileNameDisplay').innerText = userName;
        document.getElementById('profileEmailDisplay').innerText = userEmail;
        document.getElementById('profileNameTitle').innerText = userName;
        document.getElementById('profileName').value = userName;
        document.getElementById('profileEmail').value = userEmail;
        
        // Аватарка
        const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('avatarLetter').innerText = initials;
        
        if (msg) {
            msg.innerText = '✅ Профиль загружен';
            msg.style.color = 'green';
            setTimeout(() => msg.innerText = '', 2000);
        }
    } catch (error) {
        console.error('Load error:', error);
        if (msg) {
            msg.innerText = '❌ Ошибка загрузки: ' + error.message;
            msg.style.color = 'red';
        }
    }
}

async function saveProfile() {
    const name = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').value;
    const msg = document.getElementById('profileMessage');
    
    if (!name || !email) {
        if (msg) {
            msg.innerText = '❌ Имя и email не могут быть пустыми';
            msg.style.color = 'red';
        }
        return;
    }
    
    try {
        const response = await fetch('http://localhost:8081/users/1', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, email: email })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const updatedUser = await response.json();
        const newName = updatedUser.name || updatedUser.Name;
        
        // Обновляем отображение
        document.getElementById('profileNameDisplay').innerText = newName;
        document.getElementById('profileEmailDisplay').innerText = email;
        document.getElementById('profileNameTitle').innerText = newName;
        
        const initials = newName.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('avatarLetter').innerText = initials;
        
        if (msg) {
            msg.innerText = '✅ Профиль обновлён!';
            msg.style.color = 'green';
            setTimeout(() => msg.innerText = '', 2000);
        }
    } catch (error) {
        console.error('Save error:', error);
        if (msg) {
            msg.innerText = '❌ Ошибка: ' + error.message;
            msg.style.color = 'red';
        }
    }
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

// Переключение вкладок
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});



// ===== ЗАГРУЗКА АВАТАРКИ =====
function uploadAvatar(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatarDiv = document.getElementById('avatarLetter');
            avatarDiv.style.backgroundImage = `url(${e.target.result})`;
            avatarDiv.style.backgroundSize = 'cover';
            avatarDiv.style.backgroundPosition = 'center';
            avatarDiv.innerHTML = ''; // убираем текст
            
            // Сохраняем в localStorage
            localStorage.setItem('userAvatar', e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

// Загрузка сохранённой аватарки
const savedAvatar = localStorage.getItem('userAvatar');
if (savedAvatar) {
    const avatarDiv = document.getElementById('avatarLetter');
    avatarDiv.style.backgroundImage = `url(${savedAvatar})`;
    avatarDiv.style.backgroundSize = 'cover';
    avatarDiv.style.backgroundPosition = 'center';
    avatarDiv.innerHTML = '';
}



// ===== БИОГРАФИЯ С КРАСИВЫМ МОДАЛЬНЫМ ОКНОМ =====
let currentBio = '';

function loadBio() {
    const savedBio = localStorage.getItem('userBio');
    if (savedBio) {
        currentBio = savedBio;
        document.getElementById('bio-text').innerText = savedBio;
    } else {
        currentBio = 'Расскажите немного о себе...';
        document.getElementById('bio-text').innerText = currentBio;
    }
}

function editBio() {
    const modal = document.getElementById('bioModal');
    const textarea = document.getElementById('bioInput');
    textarea.value = currentBio;
    modal.style.display = 'flex';
}

function closeBioModal() {
    document.getElementById('bioModal').style.display = 'none';
}

function saveBioFromModal() {
    const newBio = document.getElementById('bioInput').value.trim();
    if (newBio !== '') {
        currentBio = newBio;
        document.getElementById('bio-text').innerText = currentBio;
        localStorage.setItem('userBio', currentBio);
    }
    closeBioModal();
}

// ===== БИОГРАФИЯ =====
// let currentBio = '';

// function loadBio() {
//     const savedBio = localStorage.getItem('userBio');
//     if (savedBio) {
//         currentBio = savedBio;
//         document.getElementById('bio-text').innerText = savedBio;
//     } else {
//         currentBio = 'Расскажите немного о себе...';
//         document.getElementById('bio-text').innerText = currentBio;
//     }
// }

// function editBio() {
//     const newBio = prompt('Расскажите о себе:', currentBio);
//     if (newBio !== null && newBio.trim() !== '') {
//         currentBio = newBio;
//         document.getElementById('bio-text').innerText = currentBio;
//         localStorage.setItem('userBio', currentBio);
//     }
// }

// // Вызываем загрузку биографии
// loadBio();

document.addEventListener('DOMContentLoaded', loadProfile);

// ===== ЗАКРЫТИЕ МОДАЛКИ ПО КЛИКУ ВНЕ ЕЁ =====
window.onclick = function(event) {
    const modal = document.getElementById('bioModal');
    if (event.target === modal) {
        closeBioModal();
    }
}





// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

// async function fetchAPI(url, options = {}) {
//     const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//     const response = await fetch(fullUrl, {
//         ...options,
//         headers: { 'Content-Type': 'application/json', ...options.headers }
//     });
//     if (!response.ok) throw new Error(`HTTP ${response.status}`);
//     return response.json();
// }

// async function loadProfile() {
//     const msg = document.getElementById('profileMessage');
//     try {
//         const user = await fetchAPI('/users/1');
//         const userId = user.id || user.ID;
//         const userName = user.name || user.Name;
//         const userEmail = user.email || user.Email;
        
//         // Обновляем все элементы
//         const idEl = document.getElementById('profileId');
//         const nameDisplayEl = document.getElementById('profileNameDisplay');
//         const emailDisplayEl = document.getElementById('profileEmailDisplay');
//         const nameTitleEl = document.getElementById('profileNameTitle');
//         const nameInput = document.getElementById('profileName');
//         const emailInput = document.getElementById('profileEmail');
//         const avatarEl = document.getElementById('avatarLetter');
        
//         if (idEl) idEl.innerText = userId;
//         if (nameDisplayEl) nameDisplayEl.innerText = userName;
//         if (emailDisplayEl) emailDisplayEl.innerText = userEmail;
//         if (nameTitleEl) nameTitleEl.innerText = userName;
//         if (nameInput) nameInput.value = userName;
//         if (emailInput) emailInput.value = userEmail;
        
//         if (avatarEl) {
//             const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
//             avatarEl.innerText = initials;
//         }
        
//         if (msg) {
//             msg.innerText = '✅ Профиль загружен';
//             msg.style.color = 'green';
//             setTimeout(() => msg.innerText = '', 2000);
//         }
//     } catch (error) {
//         console.error('Load profile error:', error);
//         if (msg) {
//             msg.innerText = '❌ Ошибка загрузки профиля';
//             msg.style.color = 'red';
//         }
//     }
// }

// async function saveProfile() {
//     const name = document.getElementById('profileName').value;
//     const email = document.getElementById('profileEmail').value;
//     const msg = document.getElementById('profileMessage');
    
//     if (!name || !email) {
//         if (msg) {
//             msg.innerText = '❌ Имя и email не могут быть пустыми';
//             msg.style.color = 'red';
//         }
//         return;
//     }
    
//     try {
//         const response = await fetch('http://localhost:8080/users/1', {
//             method: 'PUT',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ name: name, email: email })
//         });
        
//         if (!response.ok) {
//             const errorText = await response.text();
//             throw new Error(`HTTP ${response.status}: ${errorText}`);
//         }
        
//         const updatedUser = await response.json();
//         const newName = updatedUser.name || updatedUser.Name;
//         const newEmail = updatedUser.email || updatedUser.Email;
        
//         // Обновляем отображение
//         document.getElementById('profileNameDisplay').innerText = newName;
//         document.getElementById('profileEmailDisplay').innerText = newEmail;
//         document.getElementById('profileNameTitle').innerText = newName;
        
//         const initials = newName.split(' ').map(n => n[0]).join('').toUpperCase();
//         document.getElementById('avatarLetter').innerText = initials;
        
//         if (msg) {
//             msg.innerText = '✅ Профиль обновлён!';
//             msg.style.color = 'green';
//             setTimeout(() => msg.innerText = '', 2000);
//         }
//     } catch (error) {
//         console.error('Save error:', error);
//         if (msg) {
//             msg.innerText = '❌ Ошибка: ' + error.message;
//             msg.style.color = 'red';
//         }
//     }
// }

// async function saveProfile() {
//     const name = document.getElementById('profileName').value;
//     const email = document.getElementById('profileEmail').value;
//     const msg = document.getElementById('profileMessage');
    
//     if (!name || !email) {
//         if (msg) {
//             msg.innerText = '❌ Имя и email не могут быть пустыми';
//             msg.style.color = 'red';
//         }
//         return;
//     }
    
//     try {
//         // Жёстко используем ID = 1
//         const response = await fetch(`${API_BASE_URL}/users/1`, {
//             method: 'PUT',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ name: name, email: email })
//         });
        
//         if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
//         const updatedUser = await response.json();
//         const newName = updatedUser.name || updatedUser.Name;
//         const newEmail = updatedUser.email || updatedUser.Email;
        
//         // Обновляем отображение
//         document.getElementById('profileNameDisplay').innerText = newName;
//         document.getElementById('profileEmailDisplay').innerText = newEmail;
//         document.getElementById('profileNameTitle').innerText = newName;
        
//         const initials = newName.split(' ').map(n => n[0]).join('').toUpperCase();
//         document.getElementById('avatarLetter').innerText = initials;
        
//         if (msg) {
//             msg.innerText = '✅ Профиль обновлён!';
//             msg.style.color = 'green';
//             setTimeout(() => msg.innerText = '', 2000);
//         }
//     } catch (error) {
//         console.error('Save profile error:', error);
//         if (msg) {
//             msg.innerText = '❌ Ошибка: ' + error.message;
//             msg.style.color = 'red';
//         }
//     }
// }

document.addEventListener('DOMContentLoaded', loadProfile);






// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

// let currentUserId = 1; // всегда используем ID = 1

// async function fetchAPI(url, options = {}) {
//     const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//     const response = await fetch(fullUrl, {
//         ...options,
//         headers: { 'Content-Type': 'application/json', ...options.headers }
//     });
//     if (!response.ok) throw new Error(`HTTP ${response.status}`);
//     return response.json();
// }

// async function loadProfile() {
//     const msg = document.getElementById('profileMessage');
//     try {
//         // Берём первого пользователя
//         const user = await fetchAPI('/users/1');
//         const userId = user.id || user.ID;
//         const userName = user.name || user.Name;
//         const userEmail = user.email || user.Email;
        
//         currentUserId = userId;
        
//         // Обновляем все элементы на странице
//         const idEl = document.getElementById('profileId');
//         const nameDisplayEl = document.getElementById('profileNameDisplay');
//         const emailDisplayEl = document.getElementById('profileEmailDisplay');
//         const nameTitleEl = document.getElementById('profileNameTitle');
//         const nameInput = document.getElementById('profileName');
//         const emailInput = document.getElementById('profileEmail');
//         const avatarEl = document.getElementById('avatarLetter');
        
//         if (idEl) idEl.innerText = userId;
//         if (nameDisplayEl) nameDisplayEl.innerText = userName;
//         if (emailDisplayEl) emailDisplayEl.innerText = userEmail;
//         if (nameTitleEl) nameTitleEl.innerText = userName;
//         if (nameInput) nameInput.value = userName;
//         if (emailInput) emailInput.value = userEmail;
        
//         if (avatarEl) {
//             const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
//             avatarEl.innerText = initials;
//         }
        
//         if (msg) {
//             msg.innerText = '✅ Профиль загружен';
//             msg.style.color = 'green';
//             setTimeout(() => msg.innerText = '', 2000);
//         }
//     } catch (error) {
//         console.error('Load profile error:', error);
//         if (msg) {
//             msg.innerText = '❌ Ошибка загрузки профиля';
//             msg.style.color = 'red';
//         }
//     }
// }

// async function saveProfile() {
//     const name = document.getElementById('profileName').value;
//     const email = document.getElementById('profileEmail').value;
//     const msg = document.getElementById('profileMessage');
    
//     if (!name || !email) {
//         if (msg) {
//             msg.innerText = '❌ Имя и email не могут быть пустыми';
//             msg.style.color = 'red';
//         }
//         return;
//     }
    
//     try {
//         // Используем фиксированный ID = 1
//         const response = await fetch(`${API_BASE_URL}/users/${currentUserId}`, {
//             method: 'PUT',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ name: name, email: email })
//         });
        
//         if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
//         const updatedUser = await response.json();
//         const newName = updatedUser.name || updatedUser.Name;
//         const newEmail = updatedUser.email || updatedUser.Email;
        
//         // Обновляем отображение
//         document.getElementById('profileNameDisplay').innerText = newName;
//         document.getElementById('profileEmailDisplay').innerText = newEmail;
//         document.getElementById('profileNameTitle').innerText = newName;
        
//         const initials = newName.split(' ').map(n => n[0]).join('').toUpperCase();
//         document.getElementById('avatarLetter').innerText = initials;
        
//         if (msg) {
//             msg.innerText = '✅ Профиль обновлён!';
//             msg.style.color = 'green';
//             setTimeout(() => msg.innerText = '', 2000);
//         }
//     } catch (error) {
//         console.error('Save profile error:', error);
//         if (msg) {
//             msg.innerText = '❌ Ошибка: ' + error.message;
//             msg.style.color = 'red';
//         }
//     }
// }

// document.addEventListener('DOMContentLoaded', loadProfile);












// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

// let currentUserId = 1; // Временно используем ID = 1

// async function fetchAPI(url, options = {}) {
//     const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//     const response = await fetch(fullUrl, {
//         ...options,
//         headers: { 'Content-Type': 'application/json', ...options.headers }
//     });
//     if (!response.ok) throw new Error(`HTTP ${response.status}`);
//     return response.json();
// }

// async function loadProfile() {
//     const msg = document.getElementById('profileMessage');
//     try {
//         const users = await fetchAPI('/users');
//         if (users && users.length > 0) {
//             const user = users[0];
//             const userId = user.id || user.ID;
//             const userName = user.name || user.Name;
//             const userEmail = user.email || user.Email;
            
//             // Сохраняем ID глобально
//             currentUserId = userId;
            
//             // Обновляем информационные блоки
//             const idElement = document.getElementById('profileId');
//             const nameDisplayElement = document.getElementById('profileNameDisplay');
//             const emailDisplayElement = document.getElementById('profileEmailDisplay');
//             const nameTitleElement = document.getElementById('profileNameTitle');
            
//             if (idElement) idElement.innerText = userId;
//             if (nameDisplayElement) nameDisplayElement.innerText = userName;
//             if (emailDisplayElement) emailDisplayElement.innerText = userEmail;
//             if (nameTitleElement) nameTitleElement.innerText = userName;
            
//             // Обновляем аватарку (инициалы)
//             const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
//             const avatarElement = document.getElementById('avatarLetter');
//             if (avatarElement) avatarElement.innerText = initials;
            
//             // Заполняем поля редактирования
//             const nameInput = document.getElementById('profileName');
//             const emailInput = document.getElementById('profileEmail');
//             if (nameInput) nameInput.value = userName;
//             if (emailInput) emailInput.value = userEmail;
            
//             if (msg) {
//                 msg.innerText = '✅ Профиль загружен';
//                 msg.style.color = 'green';
//                 setTimeout(() => msg.innerText = '', 2000);
//             }
//         }
//     } catch (error) {
//         console.error('Load profile error:', error);
//         if (msg) {
//             msg.innerText = '❌ Ошибка загрузки профиля: ' + error.message;
//             msg.style.color = 'red';
//         }
//     }
// }


// async function saveProfile() {
//     const name = document.getElementById('profileName').value;
//     const email = document.getElementById('profileEmail').value;
//     const msg = document.getElementById('profileMessage');
    
//     // Получаем ID из элемента на странице (надёжнее)
//     let userId = document.getElementById('profileId')?.innerText;
//     if (!userId || userId === '-' || isNaN(parseInt(userId))) {
//         userId = 1; // если не нашли, используем первого пользователя
//     }
    
//     if (!name || !email) {
//         if (msg) {
//             msg.innerText = '❌ Имя и email не могут быть пустыми';
//             msg.style.color = 'red';
//         }
//         return;
//     }
    
//     try {
//         const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
//             method: 'PUT',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ name, email })
//         });
        
//         if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
//         const updatedUser = await response.json();
        
//         // Обновляем отображение на странице
//         document.getElementById('profileNameDisplay').innerText = updatedUser.name;
//         document.getElementById('profileEmailDisplay').innerText = updatedUser.email;
//         document.getElementById('profileNameTitle').innerText = updatedUser.name;
        
//         // Обновляем аватарку
//         const initials = updatedUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
//         document.getElementById('avatarLetter').innerText = initials;
        
//         if (msg) {
//             msg.innerText = '✅ Профиль обновлён!';
//             msg.style.color = 'green';
//             setTimeout(() => msg.innerText = '', 2000);
//         }
//     } catch (error) {
//         console.error('Save profile error:', error);
//         if (msg) {
//             msg.innerText = '❌ Ошибка: ' + error.message;
//             msg.style.color = 'red';
//         }
//     }
// }

// async function saveProfile() {
//     const name = document.getElementById('profileName').value;
//     const email = document.getElementById('profileEmail').value;
//     const msg = document.getElementById('profileMessage');
    
//     if (!name || !email) {
//         if (msg) {
//             msg.innerText = '❌ Имя и email не могут быть пустыми';
//             msg.style.color = 'red';
//         }
//         return;
//     }
    
//     try {
//         // Используем сохранённый ID
//         const response = await fetch(`${API_BASE_URL}/users/${currentUserId}`, {
//             method: 'PUT',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ name, email })
//         });
        
//         if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
//         if (msg) {
//             msg.innerText = '✅ Профиль обновлён!';
//             msg.style.color = 'green';
//             setTimeout(() => msg.innerText = '', 2000);
//         }
//         loadProfile(); // перезагружаем отображение
//     } catch (error) {
//         console.error('Save profile error:', error);
//         if (msg) {
//             msg.innerText = '❌ Ошибка: ' + error.message;
//             msg.style.color = 'red';
//         }
//     }
// }

document.addEventListener('DOMContentLoaded', loadProfile);







// frontend/profile.js

// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

// let currentUserId = 1;

// async function fetchAPI(url, options = {}) {
//     const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//     const response = await fetch(fullUrl, {
//         ...options,
//         headers: { 'Content-Type': 'application/json', ...options.headers }
//     });
//     if (!response.ok) throw new Error(`HTTP ${response.status}`);
//     return response.json();
// }

// async function loadProfile() {
//     const msg = document.getElementById('profileMessage');
//     try {
//         const users = await fetchAPI('/users');
//         if (users && users.length > 0) {
//             const user = users[0];
//             const userId = user.id || user.ID;
//             const userName = user.name || user.Name;
//             const userEmail = user.email || user.Email;
            
//             currentUserId = userId;
            
//             const idEl = document.getElementById('profileId');
//             const nameDisplayEl = document.getElementById('profileNameDisplay');
//             const emailDisplayEl = document.getElementById('profileEmailDisplay');
//             const nameTitleEl = document.getElementById('profileNameTitle');
//             const nameInput = document.getElementById('profileName');
//             const emailInput = document.getElementById('profileEmail');
//             const avatarEl = document.getElementById('avatarLetter');
            
//             if (idEl) idEl.innerText = userId;
//             if (nameDisplayEl) nameDisplayEl.innerText = userName;
//             if (emailDisplayEl) emailDisplayEl.innerText = userEmail;
//             if (nameTitleEl) nameTitleEl.innerText = userName;
//             if (nameInput) nameInput.value = userName;
//             if (emailInput) emailInput.value = userEmail;
            
//             if (avatarEl) {
//                 const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
//                 avatarEl.innerText = initials;
//             }
            
//             if (msg) {
//                 msg.innerText = '✅ Профиль загружен';
//                 msg.style.color = 'green';
//                 setTimeout(() => msg.innerText = '', 2000);
//             }
//         }
//     } catch (error) {
//         console.error(error);
//         if (msg) {
//             msg.innerText = '❌ Ошибка загрузки профиля';
//             msg.style.color = 'red';
//         }
//     }
// }

// async function saveProfile() {
//     const name = document.getElementById('profileName').value;
//     const email = document.getElementById('profileEmail').value;
//     const msg = document.getElementById('profileMessage');
    
//     if (!name || !email) {
//         if (msg) {
//             msg.innerText = '❌ Имя и email не могут быть пустыми';
//             msg.style.color = 'red';
//         }
//         return;
//     }
    
//     try {
//         const response = await fetch(`${API_BASE_URL}/users/${currentUserId}`, {
//             method: 'PUT',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ name, email })
//         });
//         if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
//         if (msg) {
//             msg.innerText = '✅ Профиль обновлён!';
//             msg.style.color = 'green';
//             setTimeout(() => msg.innerText = '', 2000);
//         }
//         loadProfile();
//     } catch (error) {
//         console.error(error);
//         if (msg) {
//             msg.innerText = '❌ Ошибка сохранения: ' + error.message;
//             msg.style.color = 'red';
//         }
//     }
// }

// document.addEventListener('DOMContentLoaded', loadProfile);

// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

// async function fetchAPI(url, options = {}) {
//     const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//     const response = await fetch(fullUrl, {
//         ...options,
//         headers: { 'Content-Type': 'application/json', ...options.headers }
//     });
//     if (!response.ok) throw new Error(`HTTP ${response.status}`);
//     return response.json();
// }

// async function loadProfile() {
//     const msg = document.getElementById('profileMessage');
//     try {
//         const users = await fetchAPI('/users');
//         if (users && users.length > 0) {
//             const user = users[0];
//             const userId = user.id || user.ID;
//             const userName = user.name || user.Name;
//             const userEmail = user.email || user.Email;
            
//             // Обновляем информационные блоки
//             const idElement = document.getElementById('profileId');
//             const nameDisplayElement = document.getElementById('profileNameDisplay');
//             const emailDisplayElement = document.getElementById('profileEmailDisplay');
//             const nameTitleElement = document.getElementById('profileNameTitle');
            
//             if (idElement) idElement.innerText = userId;
//             if (nameDisplayElement) nameDisplayElement.innerText = userName;
//             if (emailDisplayElement) emailDisplayElement.innerText = userEmail;
//             if (nameTitleElement) nameTitleElement.innerText = userName;
            
//             // Обновляем аватарку (инициалы)
//             const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
//             const avatarElement = document.getElementById('avatarLetter');
//             if (avatarElement) avatarElement.innerText = initials;
            
//             // Заполняем поля редактирования
//             const nameInput = document.getElementById('profileName');
//             const emailInput = document.getElementById('profileEmail');
//             if (nameInput) nameInput.value = userName;
//             if (emailInput) emailInput.value = userEmail;
            
//             if (msg) {
//                 msg.innerText = '✅ Профиль загружен';
//                 msg.style.color = 'green';
//                 setTimeout(() => msg.innerText = '', 2000);
//             }
//         }
//     } catch (error) {
//         console.error('Load profile error:', error);
//         if (msg) {
//             msg.innerText = '❌ Ошибка загрузки профиля: ' + error.message;
//             msg.style.color = 'red';
//         }
//     }
// }



async function saveProfile() {
    const name = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').value;
    
    // Пытаемся получить ID из элемента
    let userId = document.getElementById('profileId')?.innerText;
    
    // Если ID не число или прочерк, берём ID из атрибута или используем 1
    if (!userId || userId === '-' || isNaN(parseInt(userId))) {
        // Пробуем взять ID из скрытого поля (если есть)
        const hiddenId = document.getElementById('profileUserId')?.value;
        if (hiddenId) {
            userId = hiddenId;
        } else {
            userId = '1'; // временно используем первого пользователя
        }
    }
    
    const msg = document.getElementById('profileMessage');
    
    if (!name || !email) {
        if (msg) {
            msg.innerText = '❌ Имя и email не могут быть пустыми';
            msg.style.color = 'red';
        }
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        if (msg) {
            msg.innerText = '✅ Профиль обновлён!';
            msg.style.color = 'green';
            setTimeout(() => msg.innerText = '', 2000);
        }
        loadProfile(); // перезагружаем отображение
    } catch (error) {
        console.error('Save profile error:', error);
        if (msg) {
            msg.innerText = '❌ Ошибка: ' + error.message;
            msg.style.color = 'red';
        }
    }
}

// async function saveProfile() {
//     const name = document.getElementById('profileName').value;
//     const email = document.getElementById('profileEmail').value;
    
//     // БЕРЁМ ID ИЗ ДРУГОГО МЕСТА
//     let userId = document.getElementById('profileId')?.innerText;
    
//     // Если не нашли, пробуем взять из скрытого поля или используем 1
//     if (!userId || userId === '—') {
//         userId = 1; // временно используем первого пользователя
//     }
    
//     const msg = document.getElementById('profileMessage');
    
//     if (!name || !email) {
//         if (msg) {
//             msg.innerText = '❌ Имя и email не могут быть пустыми';
//             msg.style.color = 'red';
//         }
//         return;
//     }
    
//     try {
//         const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
//             method: 'PUT',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ name, email })
//         });
        
//         if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
//         if (msg) {
//             msg.innerText = '✅ Профиль обновлён!';
//             msg.style.color = 'green';
//             setTimeout(() => msg.innerText = '', 2000);
//         }
//         loadProfile(); // перезагружаем отображение
//     } catch (error) {
//         console.error('Save profile error:', error);
//         if (msg) {
//             msg.innerText = '❌ Ошибка: ' + error.message;
//             msg.style.color = 'red';
//         }
//     }
// }
// async function saveProfile() {
//     const name = document.getElementById('profileName').value;
//     const email = document.getElementById('profileEmail').value;
//     const userId = document.getElementById('profileId')?.innerText;
//     const msg = document.getElementById('profileMessage');
    
//     if (!name || !email) {
//         if (msg) {
//             msg.innerText = '❌ Имя и email не могут быть пустыми';
//             msg.style.color = 'red';
//         }
//         return;
//     }
    
//     try {
//         await fetchAPI(`/users/${userId}`, {
//             method: 'PUT',
//             body: JSON.stringify({ name, email })
//         });
//         if (msg) {
//             msg.innerText = '✅ Профиль обновлён!';
//             msg.style.color = 'green';
//             setTimeout(() => msg.innerText = '', 2000);
//         }
//         loadProfile(); // перезагружаем отображение
//     } catch (error) {
//         if (msg) {
//             msg.innerText = '❌ Ошибка: ' + error.message;
//             msg.style.color = 'red';
//         }
//     }
// }

document.addEventListener('DOMContentLoaded', loadProfile);



// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

// async function fetchAPI(url, options = {}) {
//     const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//     const response = await fetch(fullUrl, {
//         ...options,
//         headers: { 'Content-Type': 'application/json', ...options.headers }
//     });
//     if (!response.ok) throw new Error(`HTTP ${response.status}`);
//     return response.json();
// }

// async function loadProfile() {
//     const msg = document.getElementById('profileMessage');
//     try {
//         // Получаем всех пользователей (временно, пока нет JWT)
//         const users = await fetchAPI('/users');
//         if (users && users.length > 0) {
//             const user = users[0]; // берем первого пользователя
//             const userId = user.id || user.ID;
//             const userName = user.name || user.Name;
//             const userEmail = user.email || user.Email;
            
//             // Обновляем заголовок и информацию
//             document.getElementById('profileId').innerText = userId;
//             document.getElementById('profileNameDisplay').innerText = userName;
//             document.getElementById('profileEmailDisplay').innerText = userEmail;
//             document.getElementById('profileNameTitle').innerText = userName;
            
//             // Устанавливаем инициалы для аватарки
//             const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
//             document.getElementById('avatarLetter').innerText = initials;
            
//             // Заполняем поля редактирования
//             document.getElementById('profileName').value = userName;
//             document.getElementById('profileEmail').value = userEmail;
//             document.getElementById('profileIdHidden')?.setAttribute('value', userId);
            
//             if (msg) {
//                 msg.innerText = '✅ Профиль загружен';
//                 msg.style.color = 'green';
//                 setTimeout(() => msg.innerText = '', 2000);
//             }
//         }
//     } catch (error) {
//         if (msg) {
//             msg.innerText = '❌ Ошибка загрузки профиля: ' + error.message;
//             msg.style.color = 'red';
//         }
//     }
// }

// async function saveProfile() {
//     const name = document.getElementById('profileName').value;
//     const email = document.getElementById('profileEmail').value;
//     const userId = document.getElementById('profileId').innerText; // берем ID из отображения
//     const msg = document.getElementById('profileMessage');
    
//     if (!name || !email) {
//         msg.innerText = '❌ Имя и email не могут быть пустыми';
//         msg.style.color = 'red';
//         return;
//     }
    
//     try {
//         await fetchAPI(`/users/${userId}`, {
//             method: 'PUT',
//             body: JSON.stringify({ name, email })
//         });
//         msg.innerText = '✅ Профиль обновлен!';
//         msg.style.color = 'green';
//         setTimeout(() => msg.innerText = '', 2000);
//         loadProfile(); // перезагружаем отображение
//     } catch (error) {
//         msg.innerText = '❌ Ошибка: ' + error.message;
//         msg.style.color = 'red';
//     }
// }

// document.addEventListener('DOMContentLoaded', loadProfile);







// const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:8080';

// async function fetchAPI(url, options = {}) {
//     const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
//     const response = await fetch(fullUrl, options);
//     if (!response.ok) {
//         let errorMsg = `HTTP ${response.status}`;
//         try {
//             const err = await response.json();
//             errorMsg = err.error || err.message || errorMsg;
//         } catch(e) {}
//         throw new Error(errorMsg);
//     }
//     return response.json();
// }

// async function loadProfile() {
//     const messageEl = document.getElementById('profileMessage');
//     const nameInput = document.getElementById('profileName');
//     const emailInput = document.getElementById('profileEmail');
    
//     // Показать загрузку
//     if (nameInput) nameInput.value = 'Загрузка...';
//     if (emailInput) emailInput.value = 'Загрузка...';
    
//     try {
//         const users = await fetchAPI('/users');
//         if (users && users.length > 0) {
//             const user = users[0];
//             document.getElementById('profileId').value = user.id || user.ID || '';
//             if (nameInput) nameInput.value = user.name || user.Name || '';
//             if (emailInput) emailInput.value = user.email || user.Email || '';
//             if (messageEl) {
//                 messageEl.innerText = '✅ Профиль загружен';
//                 messageEl.style.color = 'green';
//                 setTimeout(() => messageEl.innerText = '', 2000);
//             }
//         } else {
//             if (messageEl) {
//                 messageEl.innerText = '⚠️ Нет пользователей';
//                 messageEl.style.color = 'orange';
//             }
//         }
//     } catch (error) {
//         console.error('Load profile error:', error);
//         if (messageEl) {
//             messageEl.innerText = '❌ Ошибка загрузки профиля: ' + error.message;
//             messageEl.style.color = 'red';
//         }
//         if (nameInput) nameInput.value = '';
//         if (emailInput) emailInput.value = '';
//     }
// }


// const API_BASE_URL = 'http://localhost:8080';

// // Универсальная функция запросов
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
//       throw new Error(errorMessage);
//     }
    
//     if (response.status === 204) {
//       return null;
//     }
    
//     return await response.json();
//   } catch (error) {
//     console.error('API Error:', error);
//     throw error;
//   }
// }

// // Загрузка профиля
// async function loadProfile() {
//   const messageEl = document.getElementById('profileMessage');
  
//   try {
//     // Пока нет JWT, берем первого пользователя из списка
//     // Позже замените на GET /me с токеном
//     // const users = await fetchAPI(`${API_BASE_URL}/users`);
//     const users = await fetchAPI('/users');
    
//     if (users && users.length > 0) {
//       const user = users[0];
//       document.getElementById('profileId').value = user.id || user.ID || '';
//       document.getElementById('profileName').value = user.name || user.Name || '';
//       document.getElementById('profileEmail').value = user.email || user.Email || '';
      
//       if (messageEl) {
//         messageEl.innerText = '✅ Profile loaded';
//         messageEl.style.color = 'green';
//         setTimeout(() => {
//           if (messageEl) messageEl.innerText = '';
//         }, 2000);
//       }
//     } else {
//       if (messageEl) {
//         messageEl.innerText = '⚠️ No users found';
//         messageEl.style.color = 'orange';
//       }
//     }
//   } catch (error) {
//     console.error('Load profile error:', error);
//     if (messageEl) {
//       messageEl.innerText = '❌ Failed to load profile: ' + error.message;
//       messageEl.style.color = 'red';
//     }
//   }
// }

// Сохранение профиля
async function saveProfile() {
  const name = document.getElementById('profileName').value;
  const email = document.getElementById('profileEmail').value;
  const userId = document.getElementById('profileId').value;
  const messageEl = document.getElementById('profileMessage');
  
  // Валидация
  if (!name || name.trim() === '') {
    if (messageEl) {
      messageEl.innerText = '❌ Name is required';
      messageEl.style.color = 'red';
    }
    return;
  }
  
  if (!email || email.trim() === '') {
    if (messageEl) {
      messageEl.innerText = '❌ Email is required';
      messageEl.style.color = 'red';
    }
    return;
  }
  
  if (!email.includes('@')) {
    if (messageEl) {
      messageEl.innerText = '❌ Invalid email format';
      messageEl.style.color = 'red';
    }
    return;
  }
  
  try {
    await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim() })
    });
    
    if (messageEl) {
      messageEl.innerText = '✅ Profile updated successfully!';
      messageEl.style.color = 'green';
      setTimeout(() => {
        if (messageEl) messageEl.innerText = '';
      }, 3000);
    }
  } catch (error) {
    console.error('Save profile error:', error);
    if (messageEl) {
      messageEl.innerText = '❌ Error: ' + error.message;
      messageEl.style.color = 'red';
    }
  }
}

// Загружаем профиль при загрузке страницы
document.addEventListener('DOMContentLoaded', loadProfile);