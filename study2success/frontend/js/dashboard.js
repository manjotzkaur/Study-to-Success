/* =====================================================
   DASHBOARD.JS
===================================================== */

/* ==============================
   HELPER FUNCTIONS
============================== */
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

/* ==============================
   LOAD DASHBOARD DATA
============================== */
async function loadDashboard() {
  try {
    const res = await fetch("/api/dashboard-data", { credentials: "include" });
    const data = await res.json();

    const subjects = data.subjects;
    const tasks = data.tasks;
    const exams = data.exams;

    document.getElementById("totalSubjects").textContent = subjects.length;
    document.getElementById("totalTasks").textContent = tasks.length;

    const completedCount = tasks.filter(t => t.completed).length;
    document.getElementById("completedTasks").textContent = completedCount;

    const percent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("progressPercent").textContent = percent + "%";

    const today = new Date();
    const upcoming = exams.filter(e => new Date(e.exam_date) >= today);
    document.getElementById("upcomingExams").textContent = upcoming.length;

  } catch (err) {
    console.error("Error loading dashboard:", err);
  }
}

/* ==============================
   TODAY TASKS
============================== */
async function loadTodayTasks() {
  const list = document.getElementById("todayTasks");
  if (!list) return;

  list.innerHTML = "";

  try {
    const res = await fetch("/api/schedule", { credentials: "include" });
    const tasks = await res.json();

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    const todayTasks = tasks.filter(t => t.due_date === todayStr);

    if (todayTasks.length === 0) {
      list.innerHTML = "<li>No tasks for today</li>";
      return;
    }

    todayTasks.forEach(task => {
      const li = document.createElement("li");
      li.textContent = `${task.title} (${task.subject})`;
      if (task.completed) li.classList.add("completed");
      list.appendChild(li);
    });

  } catch (err) {
    console.error("Error loading today tasks:", err);
    list.innerHTML = "<li>Error loading tasks</li>";
  }
}

/* ==============================
   ALL TASKS & EXAMS
============================== */
async function loadAllSchedule() {
  const list = document.getElementById("allSchedule");
  if (!list) return;

  list.innerHTML = "";

  try {
    // Fetch tasks
    const tasksRes = await fetch("/api/schedule", { credentials: "include" });
    const tasks = await tasksRes.json();

    // Fetch exams
    const examsRes = await fetch("/exams", { credentials: "include" });
    const exams = await examsRes.json();

    const combined = [];

    // Format tasks
    tasks.forEach(task => {
      combined.push({
        type: "task",
        title: task.title,
        subject: task.subject,
        date: task.due_date,
        completed: task.completed
      });
    });

    // Format exams
    exams.forEach(exam => {
      combined.push({
        type: "exam",
        title: exam.subject,
        date: exam.exam_date,
        time: exam.exam_time || "",
        location: exam.location || ""
      });
    });

    // Sort by date ascending
    combined.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (combined.length === 0) {
      list.innerHTML = "<li>No tasks or exams available</li>";
      return;
    }

    combined.forEach(item => {
      const li = document.createElement("li");
      if (item.type === "task") {
        li.textContent = `📝 ${item.title} (${item.subject}) - Due: ${formatDate(item.date)}`;
        if (item.completed) li.classList.add("completed");
      } else {
        li.textContent = `📅 ${item.title} - Exam: ${formatDate(item.date)} ${item.time ? "- " + item.time : ""} ${item.location ? "- " + item.location : ""}`;
      }
      list.appendChild(li);
    });

  } catch (err) {
    console.error("Error loading all schedule:", err);
    list.innerHTML = "<li>Error loading tasks and exams</li>";
  }
}

/* ==============================
   DEADLINE ALERT
============================== */
async function checkDeadlines() {
  const alertBox = document.getElementById("deadlineAlert");
  if (!alertBox) return;

  try {
    const res = await fetch("/api/schedule", { credentials: "include" });
    const tasks = await res.json();

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const todayStr = today.toISOString().split("T")[0];
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const urgent = tasks.find(t => !t.completed && (t.due_date === todayStr || t.due_date === tomorrowStr));

    if (urgent) {
      alertBox.style.display = "block";
      alertBox.innerText = urgent.due_date === todayStr
        ? `⚠ ${urgent.title} is due TODAY!`
        : `⚠ ${urgent.title} is due tomorrow!`;
    } else {
      alertBox.style.display = "none";
    }

  } catch (err) {
    console.error("Error checking deadlines:", err);
  }
}

/* ==============================
   STUDY TIMER
============================== */
let studyInterval = null;
let studySeconds = 0;

function updateTimerDisplay() {
  const h = String(Math.floor(studySeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((studySeconds % 3600) / 60)).padStart(2, "0");
  const s = String(studySeconds % 60).padStart(2, "0");
  document.getElementById("timerDisplay").textContent = `${h}:${m}:${s}`;
}

document.getElementById("startStudy")?.addEventListener("click", () => {
  if (studyInterval) return;
  studyInterval = setInterval(() => {
    studySeconds++;
    updateTimerDisplay();
  }, 1000);
});

document.getElementById("stopStudy")?.addEventListener("click", () => {
  clearInterval(studyInterval);
  studyInterval = null;

  // Save session to backend
  fetch("/study-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ duration: studySeconds }),
    credentials: "include"
  }).then(res => res.json())
    .then(data => console.log("Study session saved:", data))
    .catch(err => console.error(err));

  studySeconds = 0;
  updateTimerDisplay();
});

/* ==============================
   THEME TOGGLE
============================== */
document.getElementById("themeToggle")?.addEventListener("click", () => {
  document.getElementById("body").classList.toggle("dark-mode");
});

/* ==============================
   LOGOUT
============================== */
function logout() {
  fetch("/logout").then(() => window.location.href = "/login.html");
}

/* ==============================
   INIT
============================== */
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  loadTodayTasks();
  loadAllSchedule();
  checkDeadlines();
});
