const { test, expect } = require('@playwright/test');

test('Главная страница открывается', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await expect(page.locator('h1')).toContainText('Kanban Board');
});

test('Есть три колонки', async ({ page }) => {
    await page.goto('http://localhost:8080');
    const columns = page.locator('.column');
    await expect(columns).toHaveCount(3);
});

test('Можно открыть модальное окно создания задачи', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.click('button:has-text("Создать задачу")');
    await expect(page.locator('#createModal')).toBeVisible();
});

test('Можно закрыть модальное окно создания задачи', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.click('button:has-text("Создать задачу")');
    await expect(page.locator('#createModal')).toBeVisible();
    await page.click('#closeCreateModalBtn');
    await expect(page.locator('#createModal')).not.toBeVisible();
});

test('Фильтры существуют на странице', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await expect(page.locator('#priorityFilter')).toBeVisible();
    await expect(page.locator('#userFilter')).toBeVisible();
    await expect(page.locator('#searchInput')).toBeVisible();
});

test('Панель меток существует', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await expect(page.locator('.labels-panel')).toBeVisible();
});

test('Панель сортировки существует', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await expect(page.locator('.sort-pagination-panel')).toBeVisible();
});








// const { test, expect } = require('@playwright/test');

// // Вспомогательная функция для создания задачи (с ожиданием)
// async function createTestTask(page, title) {
//     await page.click('button:has-text("Создать задачу")');
//     await page.fill('#createTitle', title);
//     await page.click('#createTaskBtn');
//     // Ждём, пока модальное окно закроется
//     await expect(page.locator('#createModal')).not.toBeVisible();
//     // Ждём, пока задача появится на доске
//     await expect(page.getByText(title)).toBeVisible();
// }

// test('Главная страница открывается', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     await expect(page.locator('h1')).toContainText('Kanban Board');
// });

// test('Есть три колонки', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     const columns = page.locator('.column');
//     await expect(columns).toHaveCount(3);
// });

// test('Кнопка создания задачи открывает модальное окно и закрывает', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     await page.click('button:has-text("Создать задачу")');
//     await expect(page.locator('#createModal')).toBeVisible();
//     await page.click('#closeCreateModalBtn');
//     await expect(page.locator('#createModal')).not.toBeVisible();
// });

// test('Можно создать новую задачу', async ({ page }) => {
//     const taskTitle = `Тест ${Date.now()}`;
//     await page.goto('http://localhost:8080');
//     await createTestTask(page, taskTitle);
// });

// test('Фильтр по приоритету "high" работает', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     await createTestTask(page, `High приоритет ${Date.now()}`);
//     await page.selectOption('#priorityFilter', 'high');
//     await page.click('button:has-text("Apply Filter")');
//     await page.waitForTimeout(500);
//     await expect(page.locator('.board-container')).toBeVisible();
// });

// test('Поиск по названию задачи работает', async ({ page }) => {
//     const uniqueTitle = `Уникальная задача ${Date.now()}`;
//     await page.goto('http://localhost:8080');
//     await createTestTask(page, uniqueTitle);
//     await page.fill('#searchInput', uniqueTitle);
//     await page.waitForTimeout(500);
//     await expect(page.getByText(uniqueTitle)).toBeVisible();
// });

// test('Можно открыть и редактировать задачу', async ({ page }) => {
//     const taskTitle = `Для редактирования ${Date.now()}`;
//     const newTitle = `Отредактировано ${Date.now()}`;
    
//     await page.goto('http://localhost:8080');
//     await createTestTask(page, taskTitle);
//     await page.getByText(taskTitle).click();
//     await expect(page.locator('#modal')).toBeVisible();
//     await page.fill('#editTitle', newTitle);
//     await page.click('button:has-text("Save")');
//     await expect(page.locator('#modal')).not.toBeVisible();
//     await expect(page.getByText(newTitle)).toBeVisible();
// });

// test('Можно переместить задачу в архив', async ({ page }) => {
//     const taskTitle = `Для архива ${Date.now()}`;
    
//     await page.goto('http://localhost:8080');
//     await createTestTask(page, taskTitle);
//     await page.getByText(taskTitle).click();
//     await expect(page.locator('#modal')).toBeVisible();
//     await page.click('button:has-text("В архив")');
//     await expect(page.locator('#modal')).not.toBeVisible();
//     await expect(page.getByText(taskTitle)).not.toBeVisible();
// });

// test('Фильтр по исполнителю работает', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     await page.fill('#userFilter', '1');
//     await page.click('button:has-text("Apply Filter")');
//     await expect(page.locator('.board-container')).toBeVisible();
// });

// test('Сортировка задач работает', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     await page.selectOption('#sortBy', 'title');
//     await page.selectOption('#sortOrder', 'asc');
//     await page.click('button:has-text("Применить")');
//     await expect(page.locator('.board-container')).toBeVisible();
// });

// test('Можно создать метку', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     const labelName = `ТестМетка ${Date.now()}`;
//     await page.fill('#newLabelName', labelName);
//     await page.click('button:has-text("Добавить метку")');
//     await page.waitForTimeout(500);
//     const labelExists = await page.getByText(labelName).first().isVisible();
//     expect(labelExists).toBeTruthy();
// });

// test('Можно назначить метку задаче', async ({ page }) => {
//     const taskTitle = `Задача с меткой ${Date.now()}`;
//     const labelName = `Метка ${Date.now()}`;
    
//     await page.goto('http://localhost:8080');
//     await page.fill('#newLabelName', labelName);
//     await page.click('button:has-text("Добавить метку")');
//     await createTestTask(page, taskTitle);
//     await page.getByText(taskTitle).click();
//     await page.locator('#modalTaskLabels input[type="checkbox"]').first().check();
//     await page.click('button:has-text("Save")');
//     await expect(page.locator('#modal')).not.toBeVisible();
//     await expect(page.locator('.task-label').first()).toBeVisible();
// });

// test('Очистка фильтров работает', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     await page.selectOption('#priorityFilter', 'high');
//     await page.click('button:has-text("Apply Filter")');
//     await page.click('button:has-text("Clear Filters")');
//     await expect(page.locator('#priorityFilter')).toHaveValue('');
// });






// const { test, expect } = require('@playwright/test');

// test('Главная страница открывается', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     await expect(page.locator('h1')).toContainText('Kanban Board');
// });

// test('Есть три колонки', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     const columns = page.locator('.column');
//     await expect(columns).toHaveCount(3);
// });

// test('Кнопка создания задачи открывает модальное окно и закрывает', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     await page.click('button:has-text("Создать задачу")');
//     await expect(page.locator('#createModal')).toBeVisible();
//     await page.click('#closeCreateModalBtn');
//     await expect(page.locator('#createModal')).not.toBeVisible();
// });

// test('Можно создать новую задачу', async ({ page }) => {
//     const taskTitle = `Тест ${Date.now()}`;
//     await page.goto('http://localhost:8080');
//     await page.click('button:has-text("Создать задачу")');
//     await page.fill('#createTitle', taskTitle);
//     await page.click('#createTaskBtn');
    
//     // Ждём появления задачи с уникальным текстом
//     await expect(page.getByText(taskTitle)).toBeVisible();
// });









// const { test, expect } = require('@playwright/test');

// test('Главная страница открывается', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     await expect(page.locator('h1')).toContainText('Kanban Board');
// });

// test('Есть три колонки', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     const columns = page.locator('.column');
//     await expect(columns).toHaveCount(3);
// });

// test('Кнопка создания задачи открывает модальное окно и закрывает', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     await page.click('button:has-text("Создать задачу")');
//     await expect(page.locator('#createModal')).toBeVisible();
//     await page.click('#closeCreateModalBtn');  // ← исправлено
//     await expect(page.locator('#createModal')).not.toBeVisible();
// });

// test('Можно создать новую задачу', async ({ page }) => {
//     const taskTitle = `Тест ${Date.now()}`;
//     await page.goto('http://localhost:8080');
//     await page.click('button:has-text("Создать задачу")');
//     await page.fill('#createTitle', taskTitle);
//     await page.click('#createTaskBtn');  // ← исправлено
//     await expect(page.locator('.task')).toContainText(taskTitle);
// });













// const { test, expect } = require('@playwright/test');

// test('Главная страница открывается', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     await expect(page.locator('h1')).toContainText('Kanban Board');
// });

// test('Есть три колонки', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     const columns = page.locator('.column');
//     await expect(columns).toHaveCount(3);
// });

// test('Кнопка создания задачи открывает модальное окно', async ({ page }) => {
//     await page.goto('http://localhost:8080');
//     await page.click('button:has-text("Создать задачу")');
//     await expect(page.locator('#createModal')).toBeVisible();
//     await page.click('#createModal .cancel-btn');
// });

// test('Можно создать новую задачу', async ({ page }) => {
//     const taskTitle = `Тест ${Date.now()}`;
//     await page.goto('http://localhost:8080');
//     await page.click('button:has-text("Создать задачу")');
//     await page.fill('#createTitle', taskTitle);
//     await page.click('#createModal .save-btn');
//     await expect(page.locator('.task')).toContainText(taskTitle);
// });