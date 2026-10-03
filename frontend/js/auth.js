const API_URL = "/api";

// Login Form Handler
if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save token and user data
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Redirect based on user role
        if (data.user.isAdmin) {
          window.location.href = "admin.html";
        } else {
          window.location.href = "dashboard.html";
        }
      } else {
        showAlert("loginAlert", data.error || "Login failed", "danger");
      }
    } catch (error) {
      showAlert("loginAlert", "Network error. Please try again.", "danger");
    }
  });
}

// Register Form Handler
if (document.getElementById("registerForm")) {
  document
    .getElementById("registerForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const userData = {
        username: document.getElementById("username").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        full_name: document.getElementById("fullName").value,
        age: document.getElementById("age").value || null,
        gender: document.getElementById("gender").value || null,
        height: document.getElementById("height").value || null,
      };

      try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (response.ok) {
          showAlert(
            "registerAlert",
            "Registration successful! Redirecting to login...",
            "success",
          );
          setTimeout(() => {
            window.location.href = "login.html";
          }, 2000);
        } else {
          showAlert(
            "registerAlert",
            data.error || "Registration failed",
            "danger",
          );
        }
      } catch (error) {
        showAlert(
          "registerAlert",
          "Network error. Please try again.",
          "danger",
        );
      }
    });
}

// Helper function to show alerts
function showAlert(elementId, message, type) {
  const alertElement = document.getElementById(elementId);
  alertElement.className = `alert alert-${type}`;
  alertElement.textContent = message;
  alertElement.classList.remove("d-none");
}

// Check if user is authenticated
function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }
  return token;
}

// Check if user is admin
function checkAdminAuth() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token) {
    window.location.href = "login.html";
    return false;
  }

  if (!user || !user.isAdmin) {
    window.location.href = "dashboard.html";
    return false;
  }

  return true;
}

// Get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Logout function
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// Add logout event listener if button exists
if (document.getElementById("logoutBtn")) {
  document.getElementById("logoutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
}

// Display user info on page load
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    // Update username display in navbar if element exists
    const navUsername = document.getElementById("navUsername");
    if (navUsername) {
      navUsername.textContent = user.username;
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("adminLogout");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();

      // Clear authentication
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Optional: clear everything
      localStorage.clear();

      // Redirect to login
      window.location.href = "login.html";
    });
  }
});
