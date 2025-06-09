document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const navRight = document.querySelector(".nav-right");

  if (user && navRight) {
    navRight.innerHTML = `
      <div class="profile-circle">${user.username.charAt(0).toUpperCase()}</div>
      <a href="#" id="logout">Logout</a>
    `;

    document.getElementById("logout").addEventListener("click", () => {
      localStorage.removeItem("user");
      window.location.reload();
    });
  }

  fetch("/recipes")
    .then((res) => res.json())
    .then((data) => {
      const listContainer = document.querySelector(".recipe-list");
      if (listContainer && Array.isArray(data) && data.length > 0) {
        listContainer.innerHTML = data
          .map(
            (recipe) => `
          <div class="recipe-card">
            <h3>${recipe.title}</h3>
            <p>${recipe.description}</p>
            <button>View</button>
          </div>
        `
          )
          .join("");
      }
    })
    .catch((err) => {
      console.error("Error fetching recipes:", err);
    });
});
