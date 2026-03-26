/* =====================================================
   IMPORT MODULES
===================================================== */
const express = require("express");
const session = require("express-session");
const path = require("path");
const db = require('./database'); // MySQL connection
const app = express();
const PORT = process.env.PORT || 3000;

/* =====================================================
   MIDDLEWARE
===================================================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", 1);

// Disable caching
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "study2success-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true },
  })
);

/* =====================================================
   AUTH MIDDLEWARE
===================================================== */
function isAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login.html");
  next();
}

/* =====================================================
   AUTH ROUTES
===================================================== */

// REGISTER
app.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.json({ success: false, message: "Please fill all fields" });

  const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
  db.query(sql, [username, email, password], (err) => {
    if (err) {
      console.error("❌ DB Error:", err);
      if (err.code === "ER_DUP_ENTRY") return res.json({ success: false, message: "Email already exists" });
      return res.json({ success: false, message: "Server error" });
    }
    res.json({ success: true });
  });
});

// LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.json({ success: false, message: "Please fill all fields" });

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.json({ success: false, message: "Server error" });
    if (results.length === 0) return res.json({ success: false, message: "Invalid email or password" });

    const user = results[0];
    if (user.password === password) {
      req.session.user = { id: user.id, email: user.email, username: user.username };
      return res.json({ success: true });
    } else {
      return res.json({ success: false, message: "Invalid email or password" });
    }
  });
});

// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login.html"));
});

/* =====================================================
   PROFILE ROUTES
===================================================== */
app.get("/profile", (req, res) => {
  if (!req.session.user) return res.json(null);
  db.query("SELECT username, email FROM users WHERE id = ?", [req.session.user.id], (err, results) => {
    if (err || results.length === 0) return res.json(null);
    res.json(results[0]);
  });
});

app.put("/profile", (req, res) => {
  if (!req.session.user) return res.json({ success: false });
  const { username, email } = req.body;
  db.query(
    "UPDATE users SET username = ?, email = ? WHERE id = ?",
    [username, email, req.session.user.id],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") return res.json({ success: false, message: "Email already exists" });
        return res.json({ success: false });
      }
      req.session.user.username = username;
      req.session.user.email = email;
      res.json({ success: true });
    }
  );
});

/* =====================================================
   DASHBOARD ROUTES
===================================================== */
const dashboardPath = path.join(__dirname, "../frontend/dashboard.html");

app.get("/dashboard", isAuth, (req, res) => res.sendFile(dashboardPath));

app.get("/api/dashboard-data", isAuth, (req, res) => {
  Promise.all([
    new Promise((resolve, reject) => {
      db.query("SELECT * FROM subjects WHERE user_id = ?", [req.session.user.id], (err, results) =>
        err ? reject(err) : resolve(results)
      );
    }),
    new Promise((resolve, reject) => {
      db.query(
        "SELECT tasks.*, subjects.name AS subject FROM tasks JOIN subjects ON tasks.subject_id = subjects.id WHERE tasks.user_id = ? ORDER BY tasks.due_date ASC",
        [req.session.user.id],
        (err, results) => (err ? reject(err) : resolve(results))
      );
    }),
    new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM exams WHERE user_id = ? ORDER BY exam_date ASC",
        [req.session.user.id],
        (err, results) => (err ? reject(err) : resolve(results))
      );
    }),
    new Promise((resolve, reject) => {
      db.query(
        "SELECT IFNULL(SUM(duration),0) AS totalStudySeconds FROM study_sessions WHERE user_id = ?",
        [req.session.user.id],
        (err, results) => (err ? reject(err) : resolve(results[0].totalStudySeconds))
      );
    }),
  ])
    .then(([subjects, tasks, exams, totalStudySeconds]) => {
      res.json({ subjects, tasks, exams, totalStudySeconds });
    })
    .catch((err) => {
      console.error(err);
      res.json({ subjects: [], tasks: [], exams: [], totalStudySeconds: 0 });
    });
});

/* =====================================================
   SUBJECT ROUTES
===================================================== */
app.post("/subjects", isAuth, (req, res) => {
  const { name, desc = "" } = req.body;
  db.query("INSERT INTO subjects (user_id, name, description) VALUES (?, ?, ?)", [req.session.user.id, name, desc], (err) => {
    if (err) return res.json({ success: false, message: "Failed to add subject" });
    res.json({ success: true });
  });
});

app.get("/subjects", isAuth, (req, res) => {
  db.query("SELECT * FROM subjects WHERE user_id = ?", [req.session.user.id], (err, results) => {
    if (err) return res.json([]);
    res.json(results);
  });
});

app.put("/subjects/:id", isAuth, (req, res) => {
  const { id } = req.params;
  const { name, desc } = req.body;
  db.query("UPDATE subjects SET name = ?, description = ? WHERE id = ? AND user_id = ?", [name, desc, id, req.session.user.id], (err) => {
    if (err) return res.json({ success: false, message: "Failed to update subject" });
    res.json({ success: true });
  });
});

app.delete("/subjects/:id", isAuth, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM subjects WHERE id = ? AND user_id = ?", [id, req.session.user.id], (err) => {
    if (err) return res.json({ success: false, message: "Failed to delete subject" });
    res.json({ success: true });
  });
});

/* =====================================================
   TASK ROUTES
===================================================== */
app.get("/tasks/:subjectId", isAuth, (req, res) => {
  const { subjectId } = req.params;
  db.query("SELECT * FROM tasks WHERE user_id = ? AND subject_id = ? ORDER BY due_date ASC", [req.session.user.id, subjectId], (err, results) => {
    if (err) return res.json([]);
    res.json(results);
  });
});

app.post("/tasks", isAuth, (req, res) => {
  const { title, subjectId, dueDate } = req.body;
  db.query("INSERT INTO tasks (user_id, title, subject_id, due_date) VALUES (?, ?, ?, ?)", [req.session.user.id, title, subjectId, dueDate], (err) => {
    if (err) return res.json({ success: false, message: "Failed to add task" });
    res.json({ success: true });
  });
});

app.put("/tasks/toggle/:id", isAuth, (req, res) => {
  const { id } = req.params;
  db.query("SELECT completed FROM tasks WHERE id = ? AND user_id = ?", [id, req.session.user.id], (err, results) => {
    if (err || results.length === 0) return res.json({ success: false });
    const newStatus = results[0].completed ? 0 : 1;
    db.query("UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?", [newStatus, id, req.session.user.id], (err2) => {
      if (err2) return res.json({ success: false });
      res.json({ success: true });
    });
  });
});

app.delete("/tasks/:id", isAuth, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM tasks WHERE id = ? AND user_id = ?", [id, req.session.user.id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});

/* =====================================================
   EXAMS ROUTES
===================================================== */
app.get("/exams", isAuth, (req, res) => {
  db.query("SELECT * FROM exams WHERE user_id = ? ORDER BY exam_date ASC", [req.session.user.id], (err, results) => {
    if (err) return res.json([]);
    res.json(results);
  });
});

app.post("/exams", isAuth, (req, res) => {
  const { subject, exam_date, exam_time, location } = req.body;
  db.query("INSERT INTO exams (user_id, subject, exam_date, exam_time, location) VALUES (?, ?, ?, ?, ?)", [req.session.user.id, subject, exam_date, exam_time, location], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});

app.put("/exams/:id", isAuth, (req, res) => {
  const { id } = req.params;
  const { subject, exam_date, exam_time, location } = req.body;
  db.query("UPDATE exams SET subject = ?, exam_date = ?, exam_time = ?, location = ? WHERE id = ? AND user_id = ?", [subject, exam_date, exam_time, location, id, req.session.user.id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});

app.delete("/exams/:id", isAuth, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM exams WHERE id = ? AND user_id = ?", [id, req.session.user.id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});

/* =====================================================
   STUDY SESSION
===================================================== */
app.post("/study-session", isAuth, (req, res) => {
  const { duration } = req.body;
  if (!duration || isNaN(duration) || duration <= 0) return res.json({ success: false, message: "Invalid duration" });

  db.query("INSERT INTO study_sessions (user_id, duration) VALUES (?, ?)", [req.session.user.id, duration], (err) => {
    if (err) return res.json({ success: false, message: "DB error" });
    res.json({ success: true });
  });
});

/* =====================================================
   STATIC FILES
===================================================== */
app.use(express.static(path.join(__dirname, "../frontend")));

/* =====================================================
   START SERVER
===================================================== */
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
