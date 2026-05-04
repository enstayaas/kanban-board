let currentTask = null;

async function loadTasks() {
  const res = await fetch("http://localhost:8080/tasks");
  let tasks = await res.json();

  const priority = document.getElementById("priorityFilter").value;
  const userId = document.getElementById("userFilter").value;

  if (priority) {
    tasks = tasks.filter(t => t.Priority === priority);
  }

  if (userId) {
    tasks = tasks.filter(t => t.AssignedTo == userId);
  }

  const board = document.getElementById("board");
  board.innerHTML = "";

  const columns = [1,2,3];

  columns.forEach(col => {
    const columnDiv = document.createElement("div");
    columnDiv.className = "column";
    columnDiv.innerHTML = `<h3>Column ${col}</h3>`;

    tasks
      .filter(t => t.ColumnID === col)
      .forEach(task => {
        const taskDiv = document.createElement("div");
        taskDiv.className = "task";
        taskDiv.innerText = task.Title;

        taskDiv.onclick = () => openModal(task);

        columnDiv.appendChild(taskDiv);
      });

    board.appendChild(columnDiv);
  });
}

function openModal(task) {
  currentTask = task;

  document.getElementById("modal").style.display = "block";
  document.getElementById("editTitle").value = task.Title;
  document.getElementById("editDesc").value = task.Description || "";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

async function saveTask() {
  const title = document.getElementById("editTitle").value;
  const desc = document.getElementById("editDesc").value;

  await fetch(`http://localhost:8080/tasks/${currentTask.ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      column_id: currentTask.ColumnID,
      position: currentTask.Position,
      title: title,
      description: desc
    })
  });

  closeModal();
  loadTasks();
}

loadTasks();