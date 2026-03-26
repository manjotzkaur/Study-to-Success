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
   LOAD DASHBOARD
============================== */
async function loadDashboard() {
  try {
    const res = await fetch("/api/dashboard-data", { credentials: "include" });
    dashboardData = await res.json();

    const { subjects, tasks, exams, totalStudySeconds = 0 } = dashboardData;

    document.getElementById("totalSubjects").textContent = subjects.length;
    document.getElementById("totalTasks").textContent = tasks.length;

    const completedCount = tasks.filter(t => t.completed).length;
    document.getElementById("completedTasks").textContent = completedCount;

    const percent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("progressPercent").textContent = percent + "%";

    const h = Math.floor(totalStudySeconds / 3600);
    const m = Math.floor((totalStudySeconds % 3600) / 60);
    const s = totalStudySeconds % 60;
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
function loadTodayTasks() {
  const list = document.getElementById("todayTasks");
  if (!list || !dashboardData) return;

  list.innerHTML = "";

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const todayTasks = dashboardData.tasks.filter(t => t.due_date === todayStr);

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
}

/* ==============================
   ALL TASKS & EXAMS
============================== */
function loadAllSchedule() {
  const list = document.getElementById("allSchedule");
  if (!list || !dashboardData) return;

  list.innerHTML = "";

  const combined = [
    ...dashboardData.tasks.map(t => ({ type: "task", ...t })),
    ...dashboardData.exams.map(e => ({ type: "exam", title: e.subject, ...e }))
  ];

  combined.sort((a, b) => new Date(a.date || a.due_date) - new Date(b.date || b.due_date));

  if (!combined.length) {
    list.innerHTML = "<li>No tasks or exams available</li>";
    return;
  }

  combined.forEach(item => {
    const li = document.createElement("li");
    if (item.type === "task") {
      li.textContent = `📝 ${item.title} (${item.subject}) - Due: ${formatDate(item.due_date)}`;
      if (item.completed) li.classList.add("completed");
    } else {
      li.textContent = `📅 ${item.title} - Exam: ${formatDate(item.exam_date)} ${item.exam_time ? "- " + item.exam_time : ""} ${item.location ? "- " + item.location : ""}`;
    }
    list.appendChild(li);
  });
}

/* ==============================
   DEADLINE ALERT
============================== */
function checkDeadlines() {
  const alertBox = document.getElementById("deadlineAlert");
  if (!alertBox || !dashboardData) return;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayStr = today.toISOString().split("T")[0];
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const urgent = dashboardData.tasks.find(t => !t.completed && (t.due_date === todayStr || t.due_date === tomorrowStr));

  if (urgent) {
    alertBox.style.display = "block";
    alertBox.innerText = urgent.due_date === todayStr
      ? `⚠ ${urgent.title} is due TODAY!`
      : `⚠ ${urgent.title} is due tomorrow!`;
  } else {
    alertBox.style.display = "none";
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
    .then(() => console.log("Study session saved"))
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
  if (!title || !dashboardData.subjects.length) return alert("Add a subject first!");

  const subjectId = dashboardData.subjects[0].id;
  const todayStr = new Date().toISOString().split("T")[0];

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
      bootstrap.Modal.getInstance(modalEl).hide();

      await loadDashboard();
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
  new bootstrap.Modal(modalEl).show();
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
document.addEventListener("DOMContentLoaded", async () => {
  await loadDashboard();
  loadTodayTasks();
  loadAllSchedule();
  checkDeadlines();
});
