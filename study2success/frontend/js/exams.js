let editingExamId = null;

/* ==============================
   EXAM COUNTDOWN FUNCTION
============================== */
function getCountdown(date) {
  const today = new Date();
  const examDate = new Date(date);

  today.setHours(0,0,0,0);
  examDate.setHours(0,0,0,0);

  const diff = examDate - today;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days > 1) return `⏳ Exam in ${days} days`;
  if (days === 1) return "⏳ Exam Tomorrow";
  if (days === 0) return "⏳ Exam Today";
  return "✔ Exam Finished";
}

/* ==============================
   FORMAT DATE TO HUMAN READABLE
============================== */
function formatExamDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

/* ==============================
   LOAD EXAMS
============================== */
async function loadExams() {
  const grid = document.getElementById("examGrid");
  grid.innerHTML = "";

  try {
    const res = await fetch("/exams", { credentials: "include" });

    // Handle unauthorized
    if (res.status === 401) {
      alert("Session expired. Please login again.");
      window.location.href = "/login.html";
      return;
    }

    const exams = await res.json();

    if (!exams || exams.length === 0) {
      grid.innerHTML = "<p>No exams added yet</p>";
      return;
    }

    exams.forEach(exam => {
      const card = document.createElement("div");
      card.className = "col-md-4";

      card.innerHTML = `
        <div class="card shadow-sm p-3">
          <h5>${exam.subject}</h5>
          <p class="mb-1">📅 ${formatExamDate(exam.exam_date)}</p>
          <p class="mb-1">⏰ ${exam.exam_time}</p>
          <p class="mb-1">📍 ${exam.location}</p>
          <p class="text-primary mt-2">${getCountdown(exam.exam_date)}</p>
          <div class="d-flex gap-2 mt-2">
            <button class="btn btn-sm btn-warning edit-btn">Edit</button>
            <button class="btn btn-sm btn-danger delete-btn">Delete</button>
          </div>
        </div>
      `;

      /* ---------- DELETE ---------- */
      card.querySelector(".delete-btn").addEventListener("click", async () => {
        if (!confirm("Delete this exam?")) return;
        try {
          const delRes = await fetch(`/exams/${exam.id}`, {
            method: "DELETE",
            credentials: "include"
          });

          if (delRes.status === 401) {
            alert("Session expired. Please login again.");
            window.location.href = "/login.html";
            return;
          }

          const data = await delRes.json();
          if (data.success) loadExams();
          else alert("Failed to delete exam");
        } catch (err) {
          console.error(err);
          alert("Network error while deleting exam");
        }
      });

      /* ---------- EDIT ---------- */
      card.querySelector(".edit-btn").addEventListener("click", () => {
        editingExamId = exam.id;
        document.getElementById("examTitle").value = exam.subject;
        document.getElementById("examDate").value = exam.exam_date;
        document.getElementById("examTime").value = exam.exam_time;
        document.getElementById("examLocation").value = exam.location;
        modal.show();
      });

      grid.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading exams:", err);
    grid.innerHTML = "<p>Error loading exams</p>";
  }
}

/* ==============================
   SAVE OR UPDATE EXAM
============================== */
async function saveExam() {
  const subject = document.getElementById("examTitle").value.trim();
  const date = document.getElementById("examDate").value;
  const time = document.getElementById("examTime").value;
  const location = document.getElementById("examLocation").value.trim();

  if (!subject || !date || !time || !location) {
    alert("Please fill all fields");
    return;
  }

  try {
    const url = editingExamId ? `/exams/${editingExamId}` : "/exams";
    const method = editingExamId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ subject, exam_date: date, exam_time: time, location })
    });

    if (res.status === 401) {
      alert("Session expired. Please login again.");
      window.location.href = "/login.html";
      return;
    }

    const data = await res.json();
    if (data.success) {
      editingExamId = null;
      document.getElementById("examTitle").value = "";
      document.getElementById("examDate").value = "";
      document.getElementById("examTime").value = "";
      document.getElementById("examLocation").value = "";
      modal.hide();
      loadExams();
    } else {
      alert("Failed to save exam");
    }

  } catch (err) {
    console.error("Error saving exam:", err);
    alert("Network error while saving exam");
  }
}

/* ==============================
   MODAL CONTROL
============================== */
const modal = new bootstrap.Modal(document.getElementById("examModal"));
document.getElementById("addExamBtn").addEventListener("click", () => {
  editingExamId = null;
  document.getElementById("examTitle").value = "";
  document.getElementById("examDate").value = "";
  document.getElementById("examTime").value = "";
  document.getElementById("examLocation").value = "";
  modal.show();
});

/* ==============================
   LOAD PROFILE
============================== */
async function loadProfile() {
  try {
    const res = await fetch("/profile", { credentials: "include" });

    if (res.status === 401) {
      document.getElementById("studentName").textContent = "Guest";
      return;
    }

    const data = await res.json();
    if (data && data.username) {
      document.getElementById("studentName").textContent = data.username;
      document.getElementById("profileUsername").textContent = data.username;
      document.getElementById("profileEmail").textContent = data.email;
    }
  } catch (err) {
    console.error("Profile load error:", err);
  }
}

document.getElementById("profileBox").addEventListener("click", () => {
  const profileModal = new bootstrap.Modal(document.getElementById("profileModal"));
  profileModal.show();
});

/* ==============================
   PAGE LOAD
============================== */
document.addEventListener("DOMContentLoaded", () => {
  loadExams();
  loadProfile();
});
