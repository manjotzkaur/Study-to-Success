/* =====================================================
   IMPORT MODULES
===================================================== */
const express = require("express");
const session = require("express-session");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
const db = require('./database'); // MySQL connection

/* =====================================================
   MIDDLEWARE
===================================================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("trust proxy", 1);

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "study2success-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // keep false for local
      httpOnly: true
    }
  })
);



/* =====================================================
   AUTH ROUTES
===================================================== */

// REGISTER
app.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  // ✅ Basic validation
  if (!username || !email || !password) {
    return res.json({ success: false, message: "Please fill all fields" });
  }

  const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";

  db.query(sql, [username, email, password], (err, result) => {
    if (err) {
      console.error("❌ DB Error:", err);

      // ✅ Handle duplicate email
      if (err.code === "ER_DUP_ENTRY") {
        return res.json({ success: false, message: "Email already exists" });
      }

      return res.json({ success: false, message: "Server error" });
    }

    return res.json({ success: true });
  });
});

// LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ success: false, message: "Please fill all fields" });
  }

  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("❌ DB Error:", err);
      return res.json({ success: false, message: "Server error" });
    }

    if (results.length === 0) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    const user = results[0];

    // ✅ Password check (plain for now)
    if (user.password === password) {
      req.session.user = {
        id: user.id,
        email: user.email,
        username: user.username
      };

      console.log("✅ Logged in:", user.id);
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
   AUTH MIDDLEWARE
===================================================== */
function isAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login.html");
  next();
}
/* PROFILE ROUTES */
app.get("/profile", (req, res) => {
  if (!req.session.user) return res.json(null);

  const { id } = req.session.user;

  db.query(
    "SELECT username, email FROM users WHERE id = ?",
    [id],
    (err, results) => {
      if (err || results.length === 0) return res.json(null);
      res.json(results[0]);
    }
  );
});

app.put("/profile", (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  const { username, email } = req.body;
  const { id } = req.session.user;

 db.query(
  "UPDATE users SET username = ?, email = ? WHERE id = ?",
  [username, email, id],
  (err) => {
    if (err) {
      console.error(err);
      if (err.code === "ER_DUP_ENTRY") {
        return res.json({ success: false, message: "Email already exists" });
      }
      return res.json({ success: false });
    }

    req.session.user.username = username;
    req.session.user.email = email;

    res.json({ success: true });
  }
);
});

/* =====================================================
   PROTECTED PAGES
===================================================== */
app.get("/dashboard.html", isAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dashboard.html"));
});

app.get("/schedule.html", isAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/schedule.html"));
});


/* =====================================================
   SUBJECT ROUTES (MySQL)
===================================================== */

// ADD SUBJECT
app.post("/subjects", (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  const { name, desc = "" } = req.body;

  const sql = "INSERT INTO subjects (user_id, name, description) VALUES (?, ?, ?)";

  db.query(sql, [req.session.user.id, name, desc], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ success: false, message: "Failed to add subject" });
    }

    res.json({ success: true });
  });
});

// GET SUBJECTS
app.get("/subjects", (req, res) => {
  if (!req.session.user) return res.json([]);

  const sql = "SELECT * FROM subjects WHERE user_id = ?";

  db.query(sql, [req.session.user.id], (err, results) => {
    if (err) {
      console.error(err);
      return res.json([]);
    }

    res.json(results);
  });
});

// UPDATE SUBJECT
app.put("/subjects/:id", (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  const { id } = req.params;
  const { name, desc } = req.body;

  const sql = `
    UPDATE subjects 
    SET name = ?, description = ?
    WHERE id = ? AND user_id = ?
  `;

  db.query(sql, [name, desc, id, req.session.user.id], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ success: false, message: "Failed to update subject" });
    }

    res.json({ success: true });
  });
});

// DELETE SUBJECT
app.delete("/subjects/:id", (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  const { id } = req.params;

  const sql = "DELETE FROM subjects WHERE id = ? AND user_id = ?";

  db.query(sql, [id, req.session.user.id], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ success: false, message: "Failed to delete subject" });
    }

    res.json({ success: true });
  });
});


/* =====================================================
   TASK ROUTES (MySQL)
===================================================== */

// GET TASKS BY SUBJECT
app.get("/tasks/:subjectId", (req, res) => {
  if (!req.session.user) return res.json([]);

  const sql = `
    SELECT * FROM tasks 
    WHERE user_id = ? AND subject_id = ?
    ORDER BY due_date ASC
  `;

  db.query(sql, [req.session.user.id, req.params.subjectId], (err, results) => {
    if (err) {
      console.error(err);
      return res.json([]);
    }

    res.json(results);
  });
});

// ADD TASK
app.post("/tasks", (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  const { title, subjectId, dueDate } = req.body;

  const sql = `
    INSERT INTO tasks (user_id, title, subject_id, due_date)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [req.session.user.id, title, subjectId, dueDate], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ success: false, message: "Failed to add task" });
    }

    res.json({ success: true });
  });
});

// TOGGLE TASK
app.put("/tasks/toggle/:id", (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  const selectSql = "SELECT completed FROM tasks WHERE id = ? AND user_id = ?";

  db.query(selectSql, [req.params.id, req.session.user.id], (err, results) => {
    if (err || results.length === 0) {
      return res.json({ success: false });
    }

    const newStatus = results[0].completed ? 0 : 1;

    const updateSql = `
      UPDATE tasks SET completed = ?
      WHERE id = ? AND user_id = ?
    `;

    db.query(updateSql, [newStatus, req.params.id, req.session.user.id], (err2) => {
      if (err2) {
        console.error(err2);
        return res.json({ success: false });
      }

      res.json({ success: true });
    });
  });
});

// DELETE TASK
app.delete("/tasks/:id", (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  const sql = "DELETE FROM tasks WHERE id = ? AND user_id = ?";

  db.query(sql, [req.params.id, req.session.user.id], (err) => {
    if (err) {
      console.error(err);
      return res.json({ success: false });
    }

    res.json({ success: true });
  });
});

/* =====================================================
   EXAMS ROUTES (MySQL)
===================================================== */

// GET ALL EXAMS
app.get("/exams", (req, res) => {
  if (!req.session.user) return res.json([]);

  const sql = "SELECT * FROM exams WHERE user_id = ? ORDER BY exam_date ASC";

  db.query(sql, [req.session.user.id], (err, results) => {
    if (err) {
      console.error(err);
      return res.json([]);
    }

    res.json(results);
  });
});

// ADD EXAM
app.post("/exams", (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  const { subject, exam_date, exam_time, location } = req.body;

  const sql = `
    INSERT INTO exams (user_id, subject, exam_date, exam_time, location)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [req.session.user.id, subject, exam_date, exam_time, location],
    (err) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: "Failed to add exam" });
      }

      res.json({ success: true });
    }
  );
});

// UPDATE EXAM
app.put("/exams/:id", (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  const { id } = req.params;
  const { subject, exam_date, exam_time, location } = req.body;

  const sql = `
    UPDATE exams 
    SET subject = ?, exam_date = ?, exam_time = ?, location = ?
    WHERE id = ? AND user_id = ?
  `;

  db.query(
    sql,
    [subject, exam_date, exam_time, location, id, req.session.user.id],
    (err) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: "Failed to update exam" });
      }

      res.json({ success: true });
    }
  );
});

// DELETE EXAM
app.delete("/exams/:id", (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  const sql = "DELETE FROM exams WHERE id = ? AND user_id = ?";

  db.query(sql, [req.params.id, req.session.user.id], (err) => {
    if (err) {
      console.error(err);
      return res.json({ success: false, message: "Failed to delete exam" });
    }

    res.json({ success: true });
  });
});
/* =====================================================
   SCHEDULE ROUTES
===================================================== */
const schedulePath = path.join(__dirname, "../frontend/schedule.html");

// Serve schedule HTML page
app.get("/schedule", isAuth, (req, res) => {
  res.sendFile(schedulePath);
});

// Serve tasks JSON for schedule page
app.get("/api/schedule", isAuth, (req, res) => {
  const sql = `
    SELECT tasks.*, subjects.name AS subject
    FROM tasks
    JOIN subjects ON tasks.subject_id = subjects.id
    WHERE tasks.user_id = ?
    ORDER BY tasks.due_date ASC
  `;

  db.query(sql, [req.session.user.id], (err, results) => {
    if (err) {
      console.error(err);
      return res.json([]);
    }
    res.json(results);
  });
});

/* =====================================================
   DASHBOARD ROUTES
===================================================== */
const dashboardPath = path.join(__dirname, "../frontend/dashboard.html");

// Serve dashboard HTML page
app.get("/dashboard", isAuth, (req, res) => {
  res.sendFile(dashboardPath);
});

// Dashboard JSON data
app.get("/api/dashboard-data", isAuth, (req, res) => {
  Promise.all([
    new Promise((resolve, reject) => {
      db.query("SELECT * FROM subjects WHERE user_id = ?", [req.session.user.id], (err, results) => err ? reject(err) : resolve(results));
    }),
    new Promise((resolve, reject) => {
      db.query("SELECT tasks.*, subjects.name AS subject FROM tasks JOIN subjects ON tasks.subject_id = subjects.id WHERE tasks.user_id = ? ORDER BY tasks.due_date ASC", [req.session.user.id], (err, results) => err ? reject(err) : resolve(results));
    }),
    new Promise((resolve, reject) => {
      db.query("SELECT * FROM exams WHERE user_id = ? ORDER BY exam_date ASC", [req.session.user.id], (err, results) => err ? reject(err) : resolve(results));
    })
  ])
  .then(([subjects, tasks, exams]) => res.json({ subjects, tasks, exams }))
  .catch(err => {
    console.error(err);
    res.json({ subjects: [], tasks: [], exams: [] });
  });
});
/* ================= STUDY SESSION ================= */

app.post("/study-session", (req, res) => {
  if (!req.session.user) return res.json({ success: false });

  const { duration } = req.body;

  const sql = `
    INSERT INTO study_sessions (user_id, duration)
    VALUES (?, ?)
  `;

  db.query(sql, [req.session.user.id, duration], (err) => {
    if (err) {
      console.error(err);
      return res.json({ success: false });
    }

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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
