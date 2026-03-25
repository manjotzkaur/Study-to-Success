const form = document.getElementById("add-task-form");
const taskName = document.getElementById("taskName");
const dueDate = document.getElementById("dueDate");
const subjectSelect = document.getElementById("subjectSelect");
const tableBody = document.querySelector("#tasks-table tbody");

/* ===== LOAD SUBJECTS ===== */
async function loadSubjects() {
  subjectSelect.innerHTML = `<option value="">Select Subject</option>`;

  try {
    const res = await fetch("/subjects");
    const subjects = await res.json();

    if (subjects.length === 0) {
      const opt = document.createElement("option");
      opt.textContent = "No subjects added";
      opt.disabled = true;
      subjectSelect.appendChild(opt);
      return;
    }

    subjects.forEach(sub => {
      const option = document.createElement("option");
      option.value = sub.id;
      option.textContent = sub.name;
      subjectSelect.appendChild(option);
    });

    // Auto select first subject
    subjectSelect.value = subjects[0].id;

    renderTasks();

  } catch (err) {
    console.error("Failed to load subjects:", err);
  }
}

/* ===== FETCH TASKS ===== */
async function getTasksFromBackend(subjectId) {
  try {
    const res = await fetch(`/tasks/${subjectId}`);
    const tasks = await res.json();

    return tasks.map(t => ({
      ...t,
      dueDate: t.due_date,
      completed: t.completed === 1
    }));

  } catch (err) {
    console.error("Failed to load tasks:", err);
    return [];
  }
}

/* ===== RENDER TASKS ===== */
async function renderTasks() {
  tableBody.innerHTML = "";

  const subjectId = parseInt(subjectSelect.value);
  if (!subjectId) return;

  const tasks = await getTasksFromBackend(subjectId);

  if (tasks.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No tasks added</td></tr>`;
    return;
  }

  tasks.forEach(task => {
    const row = document.createElement("tr");

    if (task.completed) {
      row.classList.add("completed-row");
    }

    row.innerHTML = `
      <td>
        <input type="checkbox" ${task.completed ? "checked" : ""}>
      </td>
      <td>${task.title}</td>
      <td>${subjectSelect.options[subjectSelect.selectedIndex].text}</td>
      <td>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ""}</td>
      <td>
        <span class="badge ${task.completed ? "bg-success" : "bg-secondary"}">
          ${task.completed ? "Completed" : "Pending"}
        </span>
      </td>
      <td>
        <button class="delete-btn btn btn-sm btn-danger">Delete</button>
      </td>
    `;

    /* TOGGLE */
    row.querySelector("input").addEventListener("change", async () => {
      await fetch(`/tasks/toggle/${task.id}`, {
        method: "PUT"
      });
      renderTasks();
    });

    /* DELETE */
    row.querySelector(".delete-btn").addEventListener("click", async () => {
      if (!confirm("Delete this task?")) return;

      await fetch(`/tasks/${task.id}`, {
        method: "DELETE"
      });

      renderTasks();
    });

    tableBody.appendChild(row);
  });
}

/* ===== ADD TASK ===== */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!taskName.value || !dueDate.value || !subjectSelect.value) {
    alert("Please fill all fields");
    return;
  }

  try {
    const res = await fetch("/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: taskName.value,
        subjectId: subjectSelect.value,
        dueDate: dueDate.value
      })
    });

    const data = await res.json();

    if (data.success) {
      const selectedSubject = subjectSelect.value;
      form.reset();
      subjectSelect.value = selectedSubject;
      renderTasks();
    } else {
      alert(data.message || "Failed to add task");
    }

  } catch (err) {
    console.error("Error adding task:", err);
    alert("Server error");
  }
});

/* ===== SUBJECT CHANGE ===== */
subjectSelect.addEventListener("change", renderTasks);

/* ===== DARK MODE ===== */
if(localStorage.getItem("darkMode") === "true"){
  document.body.classList.add("dark-mode");
}

/* ===== PAGE LOAD ===== */
window.onload = async () => {
  await loadSubjects();
};