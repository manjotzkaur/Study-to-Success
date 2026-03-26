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
   GLOBAL DATA
============================== */
let dashboardData = null;
let studyInterval = null;
let studySeconds = 0;

/* ==============================
   LOAD DASHBOARD DATA
============================== */
async function loadDashboard() {
  try {
    const res = await fetch("/api/dashboard-data", { credentials: "include" });
    dashboardData = await res.json();

    const { subjects, tasks, exams } = dashboardData;

    document.getElementById("totalSubjects").textContent = subjects.length;
    document.getElementById("totalTasks").textContent = tasks.length;

    const completedCount = tasks.filter(t => t.completed).length;
    document.getElementById("completedTasks").textContent = completedCount;

    const percent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("progressPercent").textContent = percent + "%";

    const totalSeconds = dashboardData.totalStudySeconds || 0;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    document.getElementById("studyTime").textContent = `${h}h ${m}m ${s}s`;

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
    const res = await fetch("/api/all-schedule", { credentials: "include" });
    const { tasks } = await res.json();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const todayTasks = tasks.filter(t => t.due_date === todayStr);

    if (!todayTasks.length) {
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
    const res = await fetch("/api/all-schedule", { credentials: "include" });
    const { tasks, exams } = await res.json();

    const combined = [
      ...tasks.map(t => ({ type: "task", ...t })),
      ...exams.map(e => ({ type: "exam", title: e.subject, ...e }))
    ];

    combined.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!combined.length) {
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
    const res = await fetch("/api/all-schedule", { credentials: "include" });
    const tasks = (await res.json()).tasks;

    const today = new Date();
    const tomorrow = new Date(today);
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
   QUICK ACTION: ADD TASK
============================== */
document.getElementById("saveTaskBtn")?.addEventListener("click", async () => {
  const taskInput = document.getElementById("newTaskInput");
  const title = taskInput.value.trim();
  if (!title) return;

  const subjectId = dashboardData.subjects.length ? dashboardData.subjects[0].id : null;
  const todayStr = new Date().toISOString().split("T")[0];

  if (!subjectId) return alert("Add a subject first!");

  try {
    const res = await fetch("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, subjectId, dueDate: todayStr }),
      credentials: "include"
    });

    const data = await res.json();
    if (data.success) {
      taskInput.value = "";
      const modalEl = document.getElementById("addTaskModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal.hide();

      loadDashboard();
      loadTodayTasks();
      loadAllSchedule();
      checkDeadlines();
    }
  } catch (err) {
    console.error(err);
  }
});

/* ==============================
   QUICK ACTION: VIEW STATS
============================== */
document.getElementById("viewStatsBtn")?.addEventListener("click", () => {
  if (!dashboardData) return;

  const { tasks, subjects, totalStudySeconds = 0 } = dashboardData;
  const completedCount = tasks.filter(t => t.completed).length;
  const h = Math.floor(totalStudySeconds / 3600);
  const m = Math.floor((totalStudySeconds % 3600) / 60);
  const s = totalStudySeconds % 60;

  document.getElementById("statsText").innerHTML = `
    <strong>Total Subjects:</strong> ${subjects.length}<br>
    <strong>Total Tasks:</strong> ${tasks.length}<br>
    <strong>Completed Tasks:</strong> ${completedCount}<br>
    <strong>Study Time:</strong> ${h}h ${m}m ${s}s
  `;

  const modalEl = document.getElementById("viewStatsModal");
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
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
