const form = document.getElementById("searchForm");
const resultsDiv = document.getElementById("results");
const allRecipesDiv = document.getElementById("allRecipes");
const accountLinks = document.getElementById("account-links");

// Search
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = document.getElementById("search").value.trim();
  if (!query) return;

  const response = await fetch(
    `/search-recipe?title=${encodeURIComponent(query)}`
  );
  const data = await response.json();

  resultsDiv.innerHTML = "";
  if (!data.length) {
    resultsDiv.innerHTML = "<p>No matching recipe found.</p>";
    return;
  }

  data.forEach((recipe) => {
    const div = document.createElement("div");
    div.className = "recipe-card";
    div.innerHTML = `
      <h3>${recipe.title}</h3>
      <div class="card-buttons">
        <button class="view-btn" onclick="toggleView('result-${
          recipe.id
        }')">View</button>
      </div>
      <div class="card-details" id="result-${recipe.id}">
        <strong>Ingredients:</strong>
        <ul>${recipe.ingredients.map((i) => `<li>${i}</li>`).join("")}</ul>
        <strong>Steps:</strong>
        <ol>${recipe.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
      </div>
    `;
    resultsDiv.appendChild(div);
  });
});

// View toggle
function toggleView(id) {
  const el = document.getElementById(id);
  el.classList.toggle("visible");
}

// Load All Recipes
async function loadAllRecipes() {
  const res = await fetch("/view-recipes");
  const data = await res.json();
  allRecipesDiv.innerHTML = "";

  data.forEach((r) => {
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.innerHTML = `
      <h3>${r.title}</h3>
      <div class="card-buttons">
        <button class="view-btn" onclick="toggleView('all-${
          r.id
        }')">View</button>
        <button class="delete-btn" onclick="deleteRecipe(${
          r.id
        })">Delete</button>
      </div>
      <div class="card-details" id="all-${r.id}">
        <strong>Ingredients:</strong>
        <ul>${r.ingredients.map((i) => `<li>${i}</li>`).join("")}</ul>
        <strong>Steps:</strong>
        <ol>${r.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
      </div>
    `;
    allRecipesDiv.appendChild(card);
  });
}

// Delete Recipe
function deleteRecipe(id) {
  if (confirm("Are you sure you want to delete this recipe?")) {
    fetch(`/delete-recipe/${id}`, { method: "DELETE" }).then((res) => {
      if (res.ok) {
        alert("Recipe deleted!");
        loadAllRecipes();
      } else {
        alert("Failed to delete.");
      }
    });
  }
}

// Auth Display
async function checkAuth() {
  const res = await fetch("/check-auth");
  const { loggedIn } = await res.json();
  accountLinks.innerHTML = loggedIn
    ? '<a href="/logout">Logout</a>'
    : '<a href="/login.html">Login</a><a href="/signup.html">Signup</a>';
}

// Hamburger Toggle
document.getElementById("hamburger")?.addEventListener("click", () => {
  document.getElementById("nav-links").classList.toggle("active");
});

// Load All Recipes with clickable titles only
async function loadAllRecipes() {
  const res = await fetch("/view-recipes");
  const data = await res.json();
  allRecipesDiv.innerHTML = "";

  data.forEach((r) => {
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.innerHTML = `
      <h3 class="recipe-title" style="cursor:pointer" data-id="${r.id}">${
      r.title
    }</h3>
      <div class="card-details" id="all-${r.id}">
        <strong>Ingredients:</strong>
        <ul>${r.ingredients.map((i) => `<li>${i}</li>`).join("")}</ul>
        <strong>Steps:</strong>
        <ol>${r.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
      </div>
      <div class="card-buttons">
        <button class="delete-btn" onclick="deleteRecipe(${
          r.id
        })">Delete</button>
      </div>
    `;
    allRecipesDiv.appendChild(card);
  });

  // Attach click listeners to all recipe titles
  document.querySelectorAll(".recipe-title").forEach((title) => {
    title.addEventListener("click", () => {
      const id = title.getAttribute("data-id");
      const details = document.getElementById(`all-${id}`);
      if (details) {
        details.classList.toggle("visible");
      }
    });
  });
}

const addRecipeForm = document.getElementById("addRecipeForm");

addRecipeForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(addRecipeForm);
  const data = {};
  formData.forEach((value, key) => (data[key] = value.trim()));

  // Simple validation (optional)
  if (!data.recipe || !data.ingredients || !data.steps) {
    alert("Please fill in all fields.");
    return;
  }

  // Send POST request to add recipe
  const res = await fetch("/add-recipe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (res.ok) {
    alert("Recipe added successfully!");
    addRecipeForm.reset();
    loadAllRecipes(); // Refresh recipe list
  } else {
    alert("Failed to add recipe.");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const userArea = document.getElementById("user-area");

  fetch("/api/current-user")
    .then((res) => res.json())
    .then((data) => {
      userArea.innerHTML = ""; // Clear existing content

      if (data.username) {
        // Create avatar circle with first letter of username
        const avatar = document.createElement("div");
        avatar.textContent = data.username.charAt(0).toUpperCase();
        avatar.style.cssText = `
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #626fa4;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-right: 10px;
        `;

        // Create logout button
        const logoutBtn = document.createElement("button");
        logoutBtn.textContent = "Logout";
        logoutBtn.style.cssText = `
          padding: 8px 14px;
          background-color: #626fa4;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
        `;

        logoutBtn.addEventListener("click", () => {
          fetch("/logout", { method: "POST" })
            .then(() => window.location.reload())
            .catch((err) => console.error("Logout failed:", err));
        });

        userArea.appendChild(avatar);
        userArea.appendChild(logoutBtn);
      } else {
        // User not logged in; show login and signup links
        const loginLink = document.createElement("a");
        loginLink.href = "/login.html";
        loginLink.textContent = "Login";

        const signupLink = document.createElement("a");
        signupLink.href = "/signup.html";
        signupLink.textContent = "Signup";

        userArea.appendChild(loginLink);
        userArea.appendChild(signupLink);
      }
    })
    .catch((err) => {
      console.error("Error checking login status:", err);
    });
});

loadAllRecipes();
checkAuth();
