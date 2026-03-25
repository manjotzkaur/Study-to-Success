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
   LOAD DASHBOARD
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

    // Optional upcoming exams list
    const upcomingExamsList = document.getElementById("upcomingExamsList");
    if (upcomingExamsList) {
      upcomingExamsList.innerHTML = "";
      upcoming.forEach(exam => {
        const li = document.createElement("li");
        li.textContent = `📅 ${formatDate(exam.exam_date)} - ${exam.subject}`;
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
   INIT
============================== */
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  loadTodayTasks();
  checkDeadlines();
});
