// ============================================================================
// FITHIVE - COMPLETE DASHBOARD.JS
// ============================================================================

const API_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication
  checkAuth();

  // Load user data
  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    document.getElementById("userName").textContent =
      user.fullName || user.username;
    document.getElementById("navUsername").textContent = user.username;
  }

  // Load all dashboard data
  await loadDashboardData();
  await loadGoals();
  await loadChallenges();
  await loadArticles();
  await loadFeaturedWorkouts();
  await loadProgressChart();
});

// Load Dashboard Statistics
async function loadDashboardData() {
  try {
    // Load progress analytics
    const response = await fetch(`${API_URL}/progress/analytics`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const data = await response.json();

      // Get latest weight from recent progress entries
      const progressResponse = await fetch(`${API_URL}/progress`, {
        headers: getAuthHeaders(),
      });

      if (progressResponse.ok) {
        const progressData = await progressResponse.json();

        // Find most recent weight entry
        let latestWeight = null;
        for (let entry of progressData) {
          if (entry.weight) {
            latestWeight = entry.weight;
            break;
          }
        }

        // Update current weight
        if (latestWeight) {
          document.getElementById("currentWeight").textContent =
            parseFloat(latestWeight).toFixed(1);
        } else if (data.avg_weight) {
          document.getElementById("currentWeight").textContent =
            data.avg_weight.toFixed(1);
        } else {
          document.getElementById("currentWeight").textContent = "--";
        }
      }

      // Update other stats
      document.getElementById("totalWorkouts").textContent =
        data.total_entries || 0;
      document.getElementById("caloriesBurned").textContent =
        data.total_calories_burned || 0;

      // Update workout time
      if (data.total_workout_time) {
        document.getElementById("workoutTime").textContent =
          `${data.total_workout_time} min total`;
      }

      // Update average calories
      if (data.total_entries && data.total_calories_burned) {
        const avgCalories = Math.round(
          data.total_calories_burned / data.total_entries,
        );
        document.getElementById("avgCalories").textContent =
          `${avgCalories} avg/day`;
      }
    }
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
}

// Load User Goals
// [UPDATE] Replace your existing loadGoals function with this one
async function loadGoals() {
  // might be named loadGoalsWithProgress in your file
  try {
    const response = await fetch(`${API_URL}/goals`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const goals = await response.json();
      const container = document.getElementById("goalsContainer");
      const currentWeightEl = document.getElementById("currentWeight"); // Get the weight card

      if (goals.length === 0) {
        container.innerHTML =
          '<p class="text-center text-muted py-3">No goals set yet.</p>';
        return;
      }

      container.innerHTML = "";

      goals.forEach((goal) => {
        // [FIX] If Dashboard Weight is still empty "--", use this Goal's current weight
        if (
          currentWeightEl.textContent === "--" ||
          currentWeightEl.textContent === "Loading..."
        ) {
          if (goal.current_weight) {
            currentWeightEl.textContent = goal.current_weight + " kg";
            // Add a little tag to show where this data came from
            document.getElementById("weightChange").textContent =
              "From Goal Entry";
          }
        }

        // ... rest of your existing goal display code ...
        const progress =
          goal.current_weight && goal.target_weight
            ? Math.abs(
                ((goal.current_weight - goal.target_weight) /
                  goal.current_weight) *
                  100,
              ).toFixed(1)
            : 0;

        const goalDiv = document.createElement("div");
        goalDiv.className = "border-bottom pb-3 mb-3";
        goalDiv.innerHTML = `
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="mb-0">${goal.goal_type}</h6>
            <span class="badge bg-${goal.status === "Active" ? "success" : "secondary"}">${goal.status}</span>
          </div>
          <div class="progress mb-2" style="height: 8px;">
            <div class="progress-bar bg-success" style="width: ${progress}%"></div>
          </div>
          <small class="text-muted">Target: ${goal.target_weight} kg</small>
        `;
        container.appendChild(goalDiv);

        // Update the "Goal Weight" card while we're here
        if (goal.status === "Active" && goal.target_weight) {
          document.getElementById("goalWeight").textContent =
            goal.target_weight;
        }
      });
    }
  } catch (error) {
    console.error("Error loading goals:", error);
  }
}

// Load Active Challenges
async function loadChallenges() {
  try {
    const response = await fetch(`${API_URL}/challenges`);

    if (response.ok) {
      const challenges = await response.json();
      const container = document.getElementById("challengesContainer");

      if (challenges.length === 0) {
        container.innerHTML =
          '<p class="text-muted text-center py-3">No active challenges available.</p>';
        return;
      }

      container.innerHTML = "";
      challenges.slice(0, 3).forEach((challenge) => {
        const challengeCard = document.createElement("div");
        challengeCard.className = "border-bottom pb-3 mb-3";

        // Calculate days remaining
        const endDate = new Date(challenge.end_date);
        const today = new Date();
        const daysRemaining = Math.ceil(
          (endDate - today) / (1000 * 60 * 60 * 24),
        );

        challengeCard.innerHTML = `
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="mb-0">${challenge.challenge_name}</h6>
            <span class="badge bg-warning text-dark">${challenge.reward_points} pts</span>
          </div>
          <p class="mb-2 small text-muted">${challenge.description || "Join this challenge to earn rewards!"}</p>
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">
              ${daysRemaining > 0 ? `${daysRemaining} days remaining` : "Ends today"}
            </small>
            <button class="btn btn-sm btn-outline-primary" onclick="joinChallenge(${challenge.challenge_id})">
              Join
            </button>
          </div>
        `;

        container.appendChild(challengeCard);
      });

      // Add "View All" link if there are more challenges
      if (challenges.length > 3) {
        const viewAll = document.createElement("div");
        viewAll.className = "text-center mt-3";
        viewAll.innerHTML =
          '<a href="challenges.html" class="btn btn-sm btn-primary">View All Challenges</a>';
        container.appendChild(viewAll);
      }
    }
  } catch (error) {
    console.error("Error loading challenges:", error);
    document.getElementById("challengesContainer").innerHTML =
      '<p class="text-muted text-center py-3">Error loading challenges</p>';
  }
}

// Load Latest Articles
async function loadArticles() {
  try {
    const response = await fetch(`${API_URL}/articles`);

    if (response.ok) {
      const articles = await response.json();
      const container = document.getElementById("articlesContainer");

      if (articles.length === 0) {
        container.innerHTML =
          '<p class="text-muted text-center py-3">No articles available.</p>';
        return;
      }

      container.innerHTML = "";
      articles.slice(0, 3).forEach((article) => {
        const articleCard = document.createElement("div");
        articleCard.className = "border-bottom pb-3 mb-3";

        articleCard.innerHTML = `
          <div class="d-flex align-items-start mb-2">
            <div class="flex-grow-1">
              <h6 class="mb-1">${article.title}</h6>
              <small class="text-muted">By ${article.author || "FitHive Team"}</small>
            </div>
            <span class="badge bg-secondary">${article.category}</span>
          </div>
          <p class="small text-muted mb-2">${article.content.substring(0, 100)}...</p>
          <a href="articles.html" class="btn btn-sm btn-outline-primary">Read More</a>
        `;

        container.appendChild(articleCard);
      });

      // Add "View All" link if there are more articles
      if (articles.length > 3) {
        const viewAll = document.createElement("div");
        viewAll.className = "text-center mt-3";
        viewAll.innerHTML =
          '<a href="articles.html" class="btn btn-sm btn-primary">View All Articles</a>';
        container.appendChild(viewAll);
      }
    }
  } catch (error) {
    console.error("Error loading articles:", error);
    document.getElementById("articlesContainer").innerHTML =
      '<p class="text-muted text-center py-3">Error loading articles</p>';
  }
}

// Load Featured Workouts
async function loadFeaturedWorkouts() {
  try {
    const response = await fetch(`${API_URL}/workouts`);

    if (response.ok) {
      const workouts = await response.json();
      const container = document.getElementById("workoutsContainer");

      if (workouts.length === 0) {
        container.innerHTML =
          '<div class="col-12"><p class="text-muted text-center py-3">No workouts available.</p></div>';
        return;
      }

      container.innerHTML = "";

      // Show first 4 workouts
      workouts.slice(0, 4).forEach((workout) => {
        const workoutCard = document.createElement("div");
        workoutCard.className = "col-lg-3 col-md-6 mb-3";

        // Determine badge color based on difficulty
        const difficultyColors = {
          Beginner: "success",
          Intermediate: "warning",
          Advanced: "danger",
        };
        const badgeColor =
          difficultyColors[workout.difficulty_level] || "secondary";

        // Category icons
        const categoryIcons = {
          Cardio: "🏃",
          Strength: "💪",
          Flexibility: "🧘",
          HIIT: "⚡",
          Core: "🎯",
        };
        const icon = categoryIcons[workout.category] || "💪";

        workoutCard.innerHTML = `
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <span style="font-size: 32px;">${icon}</span>
                <span class="badge bg-${badgeColor}">${workout.difficulty_level}</span>
              </div>
              <h6 class="card-title mb-2">${workout.workout_name}</h6>
              <p class="card-text small text-muted mb-3">${workout.description ? workout.description.substring(0, 60) + "..." : "Great workout!"}</p>
              <div class="d-flex justify-content-between align-items-center mb-3">
                <small class="text-muted">⏱️ ${workout.duration_minutes} min</small>
                <small class="text-muted">🔥 ${workout.calories_burned} kcal</small>
              </div>
              <a href="workouts.html" class="btn btn-sm btn-primary w-100">View Details</a>
            </div>
          </div>
        `;

        container.appendChild(workoutCard);
      });
    }
  } catch (error) {
    console.error("Error loading workouts:", error);
    document.getElementById("workoutsContainer").innerHTML =
      '<div class="col-12"><p class="text-muted text-center py-3">Error loading workouts</p></div>';
  }
}

// Load Progress Chart
async function loadProgressChart() {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const response = await fetch(
      `${API_URL}/progress?start_date=${startDate.toISOString().split("T")[0]}&end_date=${endDate.toISOString().split("T")[0]}`,
      { headers: getAuthHeaders() },
    );

    if (response.ok) {
      const progressData = await response.json();

      if (progressData.length === 0) {
        document.getElementById("noProgressData")?.classList.remove("d-none");
        return;
      }

      // Filter entries with weight data
      const weightEntries = progressData.filter((p) => p.weight);

      if (weightEntries.length === 0) {
        document.getElementById("noProgressData")?.classList.remove("d-none");
        return;
      }

      const labels = weightEntries.map((p) =>
        new Date(p.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      );
      const weights = weightEntries.map((p) => parseFloat(p.weight));

      const ctx = document.getElementById("progressChart");
      if (ctx) {
        new Chart(ctx.getContext("2d"), {
          type: "line",
          data: {
            labels: labels,
            datasets: [
              {
                label: "Weight (kg)",
                data: weights,
                borderColor: "rgb(13, 110, 253)",
                backgroundColor: "rgba(13, 110, 253, 0.1)",
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: "top",
              },
              tooltip: {
                mode: "index",
                intersect: false,
              },
            },
            scales: {
              y: {
                beginAtZero: false,
                ticks: {
                  callback: function (value) {
                    return value + " kg";
                  },
                },
              },
            },
          },
        });
      }
    }
  } catch (error) {
    console.error("Error loading progress chart:", error);
  }
}

// Join Challenge Function
function joinChallenge(challengeId) {
  alert("Challenge joining feature coming soon! Challenge ID: " + challengeId);
  // TODO: Implement challenge participation
}
