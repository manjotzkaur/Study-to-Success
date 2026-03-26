/* ===== SELECT ELEMENTS ===== */
const userNameEl = document.getElementById("userName");
const avatarEl = document.getElementById("userAvatar");
const progressPercentEl = document.getElementById("progressPercent");
const mainProgressBar = document.getElementById("mainProgressBar");
const moduleCountEl = document.getElementById("moduleCount");
const summaryCountEl = document.getElementById("summaryCount");
const moduleProgressEl = document.getElementById("moduleProgress");
const studyHoursEl = document.getElementById("studyHours");
const streakDaysEl = document.getElementById("streakDays");

/* ===== DARK MODE ===== */
const toggleBtn = document.getElementById("themeToggle");

if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
  if (toggleBtn) toggleBtn.textContent = "☀️";
}

if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    toggleBtn.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("darkMode", isDark);
  });
}

/* ===== FETCH USER ===== */
async function loadUser() {
  try {
    const res = await fetch("/profile", { credentials: "include" });
    const user = await res.json();
    if (user && user.username) {
      userNameEl.textContent = user.username;
      avatarEl.textContent = user.username
        .split(" ")
        .map(w => w[0])
        .join("")
        .toUpperCase();
    }
  } catch (err) {
    console.error("User load error:", err);
  }
}

/* ===== FETCH TASKS ===== */
async function getTasks() {
  try {
    const res = await fetch("/schedule", { credentials: "include" });
    return await res.json();
  } catch (err) {
    console.error("Task fetch error:", err);
    return [];
  }
}

/* ===== UPDATE PROGRESS ===== */
async function updateProgress() {
  const tasks = await getTasks();
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed == 1).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  progressPercentEl.textContent = percent + "%";
  mainProgressBar.style.width = percent + "%";
  moduleCountEl.textContent = `${completed} / ${total}`;
  summaryCountEl.textContent = `${completed} of ${total} modules`;
  moduleProgressEl.style.width = percent + "%";

  // Optional: show study hours and streak based on tasks
  if (studyHoursEl) studyHoursEl.textContent = `${total * 2} hrs studied`; // assume 2 hrs per task
  if (streakDaysEl) streakDaysEl.textContent = `${completed} Days streak`;

  const successBox = document.querySelector(".success-box");
  if (successBox) {
    successBox.style.borderLeft =
      percent >= 70 ? "5px solid #22c55e" : "5px solid #ef4444";
  }
}

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadUser();
  await updateProgress();
});
