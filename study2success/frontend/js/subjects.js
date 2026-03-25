const modal = document.getElementById("modal");
const openModal = document.getElementById("openModal");
const closeModal = document.getElementById("closeModal");
const saveBtn = document.getElementById("saveSubject");
const grid = document.getElementById("subjectGrid");
const subjectName = document.getElementById("subjectName");
const subjectDesc = document.getElementById("subjectDesc");

let editSubjectId = null;

/* ================= MODAL CONTROL ================= */

openModal.onclick = () => {
  modal.style.display = "flex";
};

closeModal.onclick = () => {
  modal.style.display = "none";
  resetForm();
};

modal.onclick = (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
    resetForm();
  }
};

function resetForm() {
  subjectName.value = "";
  subjectDesc.value = "";
  editSubjectId = null;
}

/* ================= LOAD SUBJECTS ================= */

async function renderSubjects() {
  grid.innerHTML = "";

  const response = await fetch("/subjects");
  const subjects = await response.json();

  subjects.forEach((sub) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${sub.name}</h3>
      <p>${sub.description}</p>
      <div class="card-actions">
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>
    `;

    /* ---------- DELETE ---------- */
    const deleteBtn = card.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", async () => {
      const confirmDelete = confirm("Delete this subject?");
      if (!confirmDelete) return;

      const res = await fetch(`/subjects/${sub.id}`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (result.success) {
        renderSubjects();
      } else {
        alert(result.message);
      }
    });

    /* ---------- EDIT ---------- */
    const editBtn = card.querySelector(".edit-btn");
    editBtn.addEventListener("click", () => {
      subjectName.value = sub.name;
      subjectDesc.value = sub.description;
      editSubjectId = sub.id;
      modal.style.display = "flex";
    });

    grid.appendChild(card);
  });
}

/* ================= ADD / UPDATE SUBJECT ================= */

saveBtn.onclick = async () => {
  const name = subjectName.value.trim();
  const desc = subjectDesc.value.trim();

  if (!name || !desc) {
    alert("Please fill all fields");
    return;
  }

  if (editSubjectId) {
    const response = await fetch(`/subjects/${editSubjectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, desc }),
    });

    const result = await response.json();

    if (result.success) {
      modal.style.display = "none";
      resetForm();
      renderSubjects();
    } else {
      alert(result.message);
    }

  } else {
    const response = await fetch("/subjects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, desc }),
    });

    const result = await response.json();

    if (result.success) {
      modal.style.display = "none";
      resetForm();
      renderSubjects();
    } else {
      alert(result.message);
    }
  }
};

if(localStorage.getItem("darkMode") === "true"){
  document.body.classList.add("dark-mode");
}

window.onload = renderSubjects;