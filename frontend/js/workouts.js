// ============================================================================
// FITHIVE - WORKOUTS.JS - Updated with Individual Workout Pages
// ============================================================================

const API_URL = "http://localhost:3000/api";
let allWorkouts = [];

// Authentication
function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Logout
document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
});

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  if (!checkAuth()) return;

  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    document.getElementById("navUsername").textContent = user.username;
  }

  await loadWorkouts();
  document
    .getElementById("searchWorkouts")
    ?.addEventListener("input", searchWorkouts);
});

// Load workouts
async function loadWorkouts(difficulty = "", category = "") {
  try {
    let url = `${API_URL}/workouts`;
    const params = new URLSearchParams();

    if (difficulty) params.append("difficulty", difficulty);
    if (category) params.append("category", category);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url);

    if (response.ok) {
      allWorkouts = await response.json();
      displayWorkouts(allWorkouts);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Display workouts
function displayWorkouts(workouts) {
  const container = document.getElementById("workoutsContainer");
  const resultsCount = document.getElementById("resultsCount");

  resultsCount.textContent = workouts.length;

  if (workouts.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div style="font-size: 64px; opacity: 0.3;">🏋️</div>
        <h4 class="text-muted mt-3">No workouts found</h4>
        <button class="btn btn-primary" onclick="clearFilters()">Clear Filters</button>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  workouts.forEach((workout) => {
    const card = createWorkoutCard(workout);
    container.appendChild(card);
  });
}

// Create workout card
function createWorkoutCard(workout) {
  const col = document.createElement("div");
  col.className = "col-lg-4 col-md-6 mb-4";

  const difficultyColors = {
    Beginner: "success",
    Intermediate: "warning",
    Advanced: "danger",
  };

  const categoryIcons = {
    Cardio: "🏃",
    Strength: "💪",
    Flexibility: "🧘",
    HIIT: "⚡",
    Core: "🎯",
  };

  const icon = categoryIcons[workout.category] || "💪";
  const badgeColor = difficultyColors[workout.difficulty_level] || "primary";

  col.innerHTML = `
    <div class="card h-100 shadow-sm workout-card" style="cursor: pointer;">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div class="d-flex align-items-center">
            <span style="font-size: 32px; margin-right: 10px;">${icon}</span>
            <h5 class="card-title mb-0">${workout.workout_name}</h5>
          </div>
          <span class="badge bg-${badgeColor}">${workout.difficulty_level}</span>
        </div>
        
        <p class="card-text text-muted small mb-3" style="min-height: 60px;">
          ${workout.description ? workout.description.substring(0, 100) + "..." : "No description"}
        </p>
        
        <div class="row g-2 mb-3">
          <div class="col-6">
            <div class="d-flex align-items-center p-2 bg-light rounded">
              <span style="font-size: 20px; margin-right: 8px;">⏱️</span>
              <div>
                <small class="text-muted d-block" style="font-size: 10px;">Duration</small>
                <strong>${workout.duration_minutes} min</strong>
              </div>
            </div>
          </div>
          <div class="col-6">
            <div class="d-flex align-items-center p-2 bg-light rounded">
              <span style="font-size: 20px; margin-right: 8px;">🔥</span>
              <div>
                <small class="text-muted d-block" style="font-size: 10px;">Calories</small>
                <strong>${workout.calories_burned} kcal</strong>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mb-3">
          <span class="badge bg-info">${icon} ${workout.category}</span>
        </div>
        
        <div class="d-grid gap-2">
          <button class="btn btn-primary btn-sm" onclick="openWorkoutPage(${workout.workout_id})">
            Quick View
          </button>
        </div>
      </div>
      
      <div class="card-footer bg-white border-top">
        <small class="text-muted">Added ${formatDate(workout.created_at)}</small>
      </div>
    </div>
  `;

  return col;
}

// Open individual workout page
function openWorkoutPage(workoutId) {
  // Create workout folder if it doesn't exist
  // Navigate to individual workout page
  window.location.href = `workouts/workout-${workoutId}.html`;
}

// Quick view modal
async function viewQuickDetails(workoutId) {
  try {
    const response = await fetch(`${API_URL}/workouts/${workoutId}`);
    if (response.ok) {
      const workout = await response.json();

      // Create and show modal
      const modalHtml = `
        <div class="modal fade" id="quickViewModal" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header bg-primary text-white">
                <h5 class="modal-title">${workout.workout_name}</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <p class="lead">${workout.description}</p>
                <div class="row mb-3">
                  <div class="col-md-3 text-center">
                    <h4>${workout.duration_minutes}</h4>
                    <small>Minutes</small>
                  </div>
                  <div class="col-md-3 text-center">
                    <h4>${workout.calories_burned}</h4>
                    <small>Calories</small>
                  </div>
                  <div class="col-md-3 text-center">
                    <h4>${workout.difficulty_level}</h4>
                    <small>Difficulty</small>
                  </div>
                  <div class="col-md-3 text-center">
                    <h4>${workout.category}</h4>
                    <small>Category</small>
                  </div>
                </div>
                <div class="alert alert-info">
                  <strong>💡 Tip:</strong> Make sure to warm up before starting this workout!
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" onclick="openWorkoutPage(${workoutId})">Start Workout →</button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Remove existing modal if any
      const existingModal = document.getElementById("quickViewModal");
      if (existingModal) existingModal.remove();

      // Add and show new modal
      document.body.insertAdjacentHTML("beforeend", modalHtml);
      const modal = new bootstrap.Modal(
        document.getElementById("quickViewModal"),
      );
      modal.show();

      // Clean up on close
      document
        .getElementById("quickViewModal")
        .addEventListener("hidden.bs.modal", function () {
          this.remove();
        });
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Filter workouts
function filterWorkouts() {
  const difficulty = document.getElementById("difficultyFilter").value;
  const category = document.getElementById("categoryFilter").value;

  let filtered = allWorkouts;

  if (difficulty) {
    filtered = filtered.filter((w) => w.difficulty_level === difficulty);
  }

  if (category) {
    filtered = filtered.filter((w) => w.category === category);
  }

  displayWorkouts(filtered);
}

// Search workouts
function searchWorkouts() {
  const searchTerm = document
    .getElementById("searchWorkouts")
    .value.toLowerCase();

  if (searchTerm.length < 2) {
    displayWorkouts(allWorkouts);
    return;
  }

  const filtered = allWorkouts.filter(
    (workout) =>
      workout.workout_name.toLowerCase().includes(searchTerm) ||
      (workout.description &&
        workout.description.toLowerCase().includes(searchTerm)) ||
      (workout.category && workout.category.toLowerCase().includes(searchTerm)),
  );

  displayWorkouts(filtered);
}

// Clear filters
function clearFilters() {
  document.getElementById("searchWorkouts").value = "";
  document.getElementById("difficultyFilter").value = "";
  document.getElementById("categoryFilter").value = "";
  displayWorkouts(allWorkouts);
}

// Format date
function formatDate(dateString) {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

// Export functions
window.openWorkoutPage = openWorkoutPage;
window.viewQuickDetails = viewQuickDetails;
window.filterWorkouts = filterWorkouts;
window.searchWorkouts = searchWorkouts;
window.clearFilters = clearFilters;
