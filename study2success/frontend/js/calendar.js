/* ==============================
   GLOBAL DATA
============================== */

let tasks = [];
let exams = [];
let currentDate = new Date();

/* ==============================
   LOAD USER (SESSION BASED)
============================== */

async function loadUser() {
  try {
    const res = await fetch("/profile", { credentials: "include" });
    const user = await res.json();
    if (!user || !user.username) return;

    document.getElementById("studentName").textContent = user.username;
    const initials = user.username
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
    document.querySelector(".avatar").textContent = initials;
  } catch (err) {
    console.error("User load error:", err);
  }
}

/* ==============================
   LOAD TASKS + EXAMS
============================== */

async function loadEvents() {
  try {
    const [taskRes, examRes] = await Promise.all([
      fetch("/schedule", { credentials: "include" }),
      fetch("/exams", { credentials: "include" }),
    ]);

    tasks = await taskRes.json();
    exams = await examRes.json();

    renderCalendar(); // render after data loaded
  } catch (err) {
    console.error("Error loading events:", err);
  }
}

/* ==============================
   RENDER CALENDAR
============================== */

function renderCalendar() {
  const calendarDays = document.getElementById("calendarDays");
  const calendarTitle = document.getElementById("calendarTitle");

  calendarDays.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  calendarTitle.textContent = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Empty slots for previous month
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "day-box muted";
    calendarDays.appendChild(empty);
  }

  // Days
  for (let day = 1; day <= totalDays; day++) {
    const box = document.createElement("div");
    box.className = "day-box";

    const today = new Date();
    if (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      box.classList.add("today");
    }

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    box.innerHTML = `<strong>${day}</strong>`;

    // TASKS
    tasks.forEach((task) => {
      // Normalize date: support "YYYY-MM-DD" or ISO
      const taskDate = task.due_date.split("T")[0] || task.due_date;
      if (taskDate === dateStr) {
        const e = document.createElement("div");
        e.className = "event task";
        if (task.completed) e.classList.add("completed");
        e.textContent = `📚 ${task.title}`;
        box.appendChild(e);
      }
    });

    // EXAMS
    exams.forEach((exam) => {
      const examDate = exam.exam_date.split("T")[0] || exam.exam_date;
      if (examDate === dateStr) {
        const e = document.createElement("div");
        e.className = "event exam";
        e.textContent = `📝 ${exam.subject}`;
        box.appendChild(e);
      }
    });

    calendarDays.appendChild(box);
  }
}

/* ==============================
   MONTH CONTROLS
============================== */

document.getElementById("prevMonth").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

document.getElementById("nextMonth").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

/* ==============================
   DARK MODE
============================== */

if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
}

/* ==============================
   PAGE LOAD
============================== */

document.addEventListener("DOMContentLoaded", () => {
  loadUser();
  loadEvents();
});
