async function loadUsers() {
  const res = await fetch("http://localhost:8080/users");
  const users = await res.json();

  const container = document.getElementById("usersList");
  container.innerHTML = "";

  users.forEach(user => {
    const div = document.createElement("div");
    div.className = "user-card";

    div.innerHTML = `
      <h3>${user.name}</h3>
      <p>${user.email}</p>
      <button onclick="viewUser(${user.id})">View Profile</button>
    `;

    container.appendChild(div);
  });
}

function viewUser(id) {
  window.location.href = `profile.html?id=${id}`;
}

loadUsers();