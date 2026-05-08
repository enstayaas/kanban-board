// frontend/profile.js

const API_BASE_URL = 'http://localhost:8080';

// Универсальная функция запросов
async function fetchAPI(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch(e) {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    if (response.status === 204) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Загрузка профиля
async function loadProfile() {
  const messageEl = document.getElementById('profileMessage');
  
  try {
    // Пока нет JWT, берем первого пользователя из списка
    // Позже замените на GET /me с токеном
    const users = await fetchAPI(`${API_BASE_URL}/users`);
    
    if (users && users.length > 0) {
      const user = users[0];
      document.getElementById('profileId').value = user.id || user.ID || '';
      document.getElementById('profileName').value = user.name || user.Name || '';
      document.getElementById('profileEmail').value = user.email || user.Email || '';
      
      if (messageEl) {
        messageEl.innerText = '✅ Profile loaded';
        messageEl.style.color = 'green';
        setTimeout(() => {
          if (messageEl) messageEl.innerText = '';
        }, 2000);
      }
    } else {
      if (messageEl) {
        messageEl.innerText = '⚠️ No users found';
        messageEl.style.color = 'orange';
      }
    }
  } catch (error) {
    console.error('Load profile error:', error);
    if (messageEl) {
      messageEl.innerText = '❌ Failed to load profile: ' + error.message;
      messageEl.style.color = 'red';
    }
  }
}

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
    await fetchAPI(`${API_BASE_URL}/users/${userId}`, {
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