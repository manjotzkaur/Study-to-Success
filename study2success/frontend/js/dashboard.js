/* ==============================
   GLOBAL VARIABLES
============================== */
let timerInterval;
let startTime = null;

/* ==============================
   HELPER FUNCTIONS
============================== */
// Format ISO date to "Apr 2, 2026"
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "short", 
    day: "numeric" 
  });
}

/* ==============================
   DASHBOARD DATA
============================== */
async function loadDashboard() {
  try {
    // Fetch subjects, tasks, exams
    const [subjectsRes, tasksRes, examsRes] = await Promise.all([
      fetch("/subjects", { credentials: "include" }),
      fetch("/schedule", { credentials: "include" }),
      fetch("/exams", { credentials: "include" })
    ]);

    const subjects = await subjectsRes.json();
    const tasks = await tasksRes.json();
    const exams = (await examsRes.json()) || [];

    // Dashboard cards
    document.getElementById("totalSubjects").textContent = subjects.length;
    document.getElementById("totalTasks").textContent = tasks.length;

    const completedCount = tasks.filter(t => t.completed === 1).length;
    document.getElementById("completedTasks").textContent = completedCount;

    // Progress bar
    const percent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("progressPercent").textContent = percent + "%";

    // Upcoming exams count
    const today = new Date();
    const upcoming = exams.filter(e => new Date(e.exam_date) >= today);
    document.getElementById("upcomingExams").textContent = upcoming.length;

    // OPTIONAL: Display upcoming exams in a list if you add a container in HTML
    const upcomingExamsList = document.getElementById("upcomingExamsList");
    if (upcomingExamsList) {
      upcomingExamsList.innerHTML = "";
      upcoming.forEach(exam => {
        const li = document.createElement("li");
        li.textContent = `📅 ${formatDate(exam.exam_date)} - ${exam.title}`;
        upcomingExamsList.appendChild(li);
      });
    }

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
    const res = await fetch("/schedule", { credentials: "include" });
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
      if (task.completed === 1) li.classList.add("completed");
      list.appendChild(li);
    });

  } catch (err) {
    console.error("Error loading today tasks:", err);
    list.innerHTML = "<li>Error loading tasks</li>";
  }
}

/* ==============================
   DEADLINE ALERT
============================== */
async function checkDeadlines() {
  const alertBox = document.getElementById("deadlineAlert");
  if (!alertBox) return;

  try {
    const res = await fetch("/schedule", { credentials: "include" });
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
function initStudyTimer() {
  const display = document.getElementById("timerDisplay");
  const startBtn = document.getElementById("startStudy");
  const stopBtn = document.getElementById("stopStudy");
  const studyTimeDisplay = document.getElementById("studyTime");

  if (!display || !startBtn || !stopBtn) return;

  startBtn.onclick = () => {
    startTime = Date.now();

    timerInterval = setInterval(() => {
      const diff = Date.now() - startTime;

      const hr = Math.floor(diff / 3600000);
      const min = Math.floor(diff / 60000) % 60;
      const sec = Math.floor(diff / 1000) % 60;

      display.textContent = `${hr}h ${min}m ${sec}s`;
      if (studyTimeDisplay) studyTimeDisplay.textContent = display.textContent;
    }, 1000);
  };

  stopBtn.onclick = async () => {
    clearInterval(timerInterval);

    const durationMs = Date.now() - startTime;
    const minutes = Math.floor(durationMs / 60000);

    if (minutes <= 0) {
      alert("Study at least 1 minute!");
      return;
    }

    try {
      await fetch("/study-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ duration: minutes })
      });
      alert("Study session saved!");
    } catch (err) {
      console.error("Timer save error:", err);
    }
  };
}

/* ==============================
   DARK MODE
============================== */
function initDarkMode() {
  const toggleBtn = document.getElementById("themeToggle");
  if (!toggleBtn) return;

  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
    toggleBtn.textContent = "☀️";
  }

  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const dark = document.body.classList.contains("dark-mode");
    toggleBtn.textContent = dark ? "☀️" : "🌙";
    localStorage.setItem("darkMode", dark);
  });
}

/* ==============================
   ADD TASK MODAL
============================== */
function initAddTaskModal() {
  const openBtn = document.getElementById("openAddTaskBtn");
  const saveBtn = document.getElementById("saveTaskBtn");
  const input = document.getElementById("newTaskInput");

  if (!openBtn || !saveBtn || !input) return;

  const modal = new bootstrap.Modal(document.getElementById("addTaskModal"));

  openBtn.onclick = () => modal.show();

  saveBtn.onclick = async () => {
    const title = input.value.trim();
    if (!title) return alert("Enter task name");

    try {
      await fetch("/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title })
      });
      input.value = "";
      modal.hide();
      loadTodayTasks();
      loadDashboard();
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };
}

/* ==============================
   VIEW STATS MODAL
============================== */
function initViewStatsModal() {
  const openBtn = document.getElementById("openViewStatsBtn");
  const statsText = document.getElementById("statsText");
  if (!openBtn || !statsText) return;

  const modal = new bootstrap.Modal(document.getElementById("viewStatsModal"));

  openBtn.onclick = async () => {
    try {
      const res = await fetch("/schedule", { credentials: "include" });
      const tasks = await res.json();
      const completed = tasks.filter(t => t.completed).length;
      statsText.textContent = `You have completed ${completed} out of ${tasks.length} tasks.`;
      modal.show();
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  };
}

/* ==============================
   INITIALIZE ALL
============================== */
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  loadTodayTasks();
  checkDeadlines();
  initStudyTimer();
  initDarkMode();
  initAddTaskModal();
  initViewStatsModal();
});