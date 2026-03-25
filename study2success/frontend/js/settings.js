// ==========================
// SETTINGS.JS
// ==========================

// Load profile & dark mode on page load
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/profile", { credentials: "include" });
    const data = await res.json();

    if (data) {
      document.getElementById("studentName").value = data.username || "";
      document.getElementById("studentEmail").value = data.email || "";
    }
  } catch (err) {
    console.error("Failed to load profile:", err);
  }

  // Dark mode preference
  const darkModeCheckbox = document.getElementById("darkMode");
  const darkModePref = localStorage.getItem("darkMode") === "true";
  darkModeCheckbox.checked = darkModePref;
  document.body.classList.toggle("dark-mode", darkModePref);

  // Real-time toggle
  darkModeCheckbox.addEventListener("change", (e) => {
    document.body.classList.toggle("dark-mode", e.target.checked);
  });
});

// ==========================
// UPDATE PROFILE
// ==========================
document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("studentName").value.trim();
  const email = document.getElementById("studentEmail").value.trim();

  try {
    const res = await fetch("/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, email })
    });

    const data = await res.json();

    if (data.success) {
      alert("✅ Profile updated!");
    } else {
      alert("❌ Update failed: " + (data.message || "Unknown error"));
    }
  } catch (err) {
    console.error(err);
    alert("❌ Network error");
  }
});

// ==========================
// LOGOUT
// ==========================
function logout() {
  window.location.href = "/logout";
}

// ==========================
// SAVE APP SETTINGS
// ==========================
function saveAppSettings() {
  const darkMode = document.getElementById("darkMode").checked;

  // Save in localStorage
  localStorage.setItem("darkMode", darkMode);

  alert(`Preferences saved!\nDark Mode: ${darkMode}`);
}