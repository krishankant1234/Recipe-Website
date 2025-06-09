const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();
const port = 3000;

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Session config (not used in frontend yet but available)
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);

// MySQL DB Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Kris8860051565$$$",
  database: "recipe_app",
});

db.connect((err) => {
  if (err) throw err;
  console.log("✅ MySQL Database Connected!");
});

// Signup Route
app.post("/signup", (req, res) => {
  const { username, email, password } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) throw err;
    db.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hash],
      (err) => {
        if (err) throw err;
        res.redirect("/login.html");
      }
    );
  });
});

// Login Route
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) throw err;

    if (results.length > 0) {
      bcrypt.compare(password, results[0].password, (err, match) => {
        if (match) {
          // Send JavaScript to client to store user in localStorage
          const username = results[0].username;
          res.send(`
            <script>
              localStorage.setItem('user', JSON.stringify({ username: '${username}' }));
              window.location.href = "/recipe.html";
            </script>
          `);
        } else {
          res.send("❌ Incorrect password");
        }
      });
    } else {
      res.send("❌ User not found");
    }
  });
});

// Get All Recipes Route
app.get("/recipes", (req, res) => {
  db.query("SELECT * FROM recipes", (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.listen(port, () =>
  console.log(`🚀 Server running at http://localhost:${port}`)
);
