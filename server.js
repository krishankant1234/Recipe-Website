const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = 3000;

// MySQL DB connection
const db = mysql.createConnection({
  host: "localhost",
  user: "port",
  password: "krishankant8860051565$$$", // Your password
  database: "recipe_app",
  
});

db.connect((err) => {
  if (err) throw err;
  console.log("✅ MySQL Connected!");
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Static files (CSS, JS, recipe.html)
app.use(express.static(path.join(__dirname, "public")));

// Session
app.use(
  session({
    secret: "secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

// Routes
app.get("/", (req, res) => {
  const filePath = path.join(__dirname, "public", "recipe.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("recipe.html not found");
  }
});

// ✅ Serve login and signup from views/
app.get("/login.html", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "login.html"))
);

app.get("/signup.html", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "signup.html"))
);

// Signup route
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hash],
      (err) => {
        if (err) throw err;
        res.redirect("/login.html");
      }
    );
  } catch (error) {
    res.status(500).send("Error signing up");
  }
});

// Login route
// Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, result) => {
      if (err) throw err;
      if (
        result.length > 0 &&
        (await bcrypt.compare(password, result[0].password))
      ) {
        req.session.user = { id: result[0].id, username: result[0].username };
        res.redirect("/");
      } else {
        res.send("Invalid credentials.");
      }
    }
  );
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Check authentication status
// Check authentication status
app.get("/check-auth", (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, username: req.session.user.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// Add a new recipe
app.post("/add-recipe", (req, res) => {
  const { recipe, ingredients, steps } = req.body;

  db.query(
    "INSERT INTO recipes (title) VALUES (?)",
    [recipe],
    (err, result) => {
      if (err) return res.status(500).json({ error: "DB insert error" });

      const recipeId = result.insertId;
      const ingredientList = ingredients.split(",").map((item) => item.trim());
      const stepList = steps
        .split(".")
        .map((s) => s.trim())
        .filter(Boolean);

      const ingredientPromises = ingredientList.map(
        (ingredient) =>
          new Promise((resolve, reject) =>
            db.query(
              "INSERT INTO ingredients (recipe_id, ingredient) VALUES (?, ?)",
              [recipeId, ingredient],
              (err) => (err ? reject(err) : resolve())
            )
          )
      );

      const stepPromises = stepList.map(
        (step, index) =>
          new Promise((resolve, reject) =>
            db.query(
              "INSERT INTO steps (recipe_id, step_number, step_text) VALUES (?, ?, ?)",
              [recipeId, index + 1, step],
              (err) => (err ? reject(err) : resolve())
            )
          )
      );

      Promise.all([...ingredientPromises, ...stepPromises])
        .then(() => res.json({ message: "Recipe added" }))
        .catch(() =>
          res.status(500).json({ error: "Error inserting details" })
        );
    }
  );
});

// View all recipes
app.get("/view-recipes", (req, res) => {
  db.query("SELECT * FROM recipes", (err, recipes) => {
    if (err) return res.status(500).send("Error fetching recipes");

    const promises = recipes.map((recipe) => {
      return new Promise((resolve, reject) => {
        db.query(
          "SELECT ingredient FROM ingredients WHERE recipe_id = ?",
          [recipe.id],
          (err, ingredients) => {
            if (err) return reject(err);
            db.query(
              "SELECT step_text FROM steps WHERE recipe_id = ? ORDER BY step_number",
              [recipe.id],
              (err, steps) => {
                if (err) return reject(err);
                resolve({
                  id: recipe.id,
                  title: recipe.title,
                  ingredients: ingredients.map((i) => i.ingredient),
                  steps: steps.map((s) => s.step_text),
                });
              }
            );
          }
        );
      });
    });

    Promise.all(promises)
      .then((data) => res.json(data))
      .catch(() => res.status(500).send("Error fetching full recipe data"));
  });
});

// Search for recipe
app.get("/search-recipe", (req, res) => {
  const title = req.query.title;
  db.query(
    "SELECT * FROM recipes WHERE title LIKE ?",
    [`%${title}%`],
    (err, recipes) => {
      if (err) return res.status(500).send("Error searching recipes");

      const promises = recipes.map((recipe) => {
        return new Promise((resolve, reject) => {
          db.query(
            "SELECT ingredient FROM ingredients WHERE recipe_id = ?",
            [recipe.id],
            (err, ingredients) => {
              if (err) return reject(err);
              db.query(
                "SELECT step_text FROM steps WHERE recipe_id = ? ORDER BY step_number",
                [recipe.id],
                (err, steps) => {
                  if (err) return reject(err);
                  resolve({
                    id: recipe.id,
                    title: recipe.title,
                    ingredients: ingredients.map((i) => i.ingredient),
                    steps: steps.map((s) => s.step_text),
                  });
                }
              );
            }
          );
        });
      });

      Promise.all(promises)
        .then((data) => res.json(data))
        .catch(() => res.status(500).send("Error combining recipe data"));
    }
  );
});

// Delete a recipe
app.delete("/delete-recipe/:id", (req, res) => {
  const recipeId = req.params.id;

  db.query("DELETE FROM steps WHERE recipe_id = ?", [recipeId], (err) => {
    if (err) return res.status(500).send("Error deleting steps");

    db.query(
      "DELETE FROM ingredients WHERE recipe_id = ?",
      [recipeId],
      (err) => {
        if (err) return res.status(500).send("Error deleting ingredients");

        db.query("DELETE FROM recipes WHERE id = ?", [recipeId], (err) => {
          if (err) return res.status(500).send("Error deleting recipe");
          res.sendStatus(200);
        });
      }
    );
  });
});

// Required for session support
//const session = require("express-session");

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// After login
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // DB query to find user
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.sendStatus(500);
    if (results.length === 0) return res.send("Invalid credentials");

    const user = results[0];

    // Check password using bcrypt or plain (for demo)
    if (user.password !== password) return res.send("Invalid credentials");

    // Save username in session
    req.session.user = { username: user.username };
    res.redirect("/recipe.html");
  });
});

// API to send user info
app.get("/api/current-user", (req, res) => {
  if (req.session.user) {
    res.json({ username: req.session.user.username });
  } else {
    res.json({ username: null });
  }
});

// Logout route
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.sendStatus(200);
  });
});

// Start the server
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
