// ============================================================================
// FITHIVE - ADMIN PANEL JAVASCRIPT
// ============================================================================

const API_URL = 'http://localhost:3000/api';

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuth()) return;

  
  
  // Load username
  const user = JSON.parse(localStorage.getItem('user'));
  if (user) {
    const badges = document.querySelectorAll('#adminUserBadge');
    badges.forEach(badge => badge.textContent = user.username);
  }
  
  // Setup logout
  document.getElementById('adminLogout')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
  
  // Setup sidebar toggle for mobile
  document.getElementById('sidebarToggle')?.addEventListener('click', toggleSidebar);
  
  // Load dashboard if on admin.html
  if (window.location.pathname.includes('admin.html')) {
    await loadAdminDashboard();
  }
});

// Toggle sidebar on mobile
function toggleSidebar() {
  const sidebar = document.querySelector('.admin-sidebar');
  sidebar.classList.toggle('show');
}

// Check authentication
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// ============================================================================
// DASHBOARD FUNCTIONS
// ============================================================================

async function loadAdminDashboard() {
  try {
    // Load analytics
    await loadAnalytics();
    
    // Load recent users
    await loadRecentUsers();
    
    // Load recent activity
    await loadRecentActivity();
    
    // Load charts
    await loadUserRegistrationChart();
    await loadWorkoutCategoryChart();
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
  }
}

async function loadAnalytics() {
  try {
    const response = await fetch(`${API_URL}/admin/analytics`, {
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      const analytics = await response.json();
      
      document.getElementById('totalUsers').textContent = analytics.totalUsers || 0;
      document.getElementById('activeUsers').textContent = analytics.activeUsers || 0;
      document.getElementById('totalWorkouts').textContent = analytics.totalWorkouts || 0;
      document.getElementById('totalArticles').textContent = analytics.totalArticles || 0;
    }
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
}

async function loadRecentUsers() {
  try {
    const response = await fetch(`${API_URL}/admin/users?limit=5`, {
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      const users = await response.json();
      displayRecentUsers(users);
    }
  } catch (error) {
    console.error('Error loading recent users:', error);
  }
}

function displayRecentUsers(users) {
  const tbody = document.getElementById('recentUsersTable');
  if (!tbody) return;
  
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No users yet</td></tr>';
    return;
  }
  
  tbody.innerHTML = '';
  users.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.username}</td>
      <td><small>${user.email}</small></td>
      <td><small>${formatDate(user.created_at)}</small></td>
      <td><span class="badge bg-${user.is_active ? 'success' : 'danger'} badge-sm">${user.is_active ? 'Active' : 'Inactive'}</span></td>
    `;
    tbody.appendChild(row);
  });
}

async function loadRecentActivity() {
  try {
    const response = await fetch(`${API_URL}/admin/activity`, {
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      const activities = await response.json();
      displayRecentActivity(activities);
    }
  } catch (error) {
    console.error('Error loading recent activity:', error);
    // Show placeholder if endpoint doesn't exist yet
    const container = document.getElementById('recentActivityList');
    if (container) {
      container.innerHTML = `
        <div class="list-group">
          <div class="list-group-item">
            <small class="text-muted">No recent activity to display</small>
          </div>
        </div>
      `;
    }
  }
}

function displayRecentActivity(activities) {
  const container = document.getElementById('recentActivityList');
  if (!container) return;
  
  if (activities.length === 0) {
    container.innerHTML = '<p class="text-muted small">No recent activity</p>';
    return;
  }
  
  container.innerHTML = '<div class="list-group list-group-flush">';
  activities.slice(0, 5).forEach(activity => {
    container.innerHTML += `
      <div class="list-group-item px-0">
        <div class="d-flex w-100 justify-content-between">
          <h6 class="mb-1 small">${activity.action}</h6>
          <small class="text-muted">${formatDate(activity.created_at)}</small>
        </div>
        <p class="mb-1 small text-muted">${activity.description}</p>
      </div>
    `;
  });
  container.innerHTML += '</div>';
}

async function loadUserRegistrationChart() {
  try {
    const response = await fetch(`${API_URL}/admin/user-registration-trend`, {
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      const data = await response.json();
      createUserRegistrationChart(data);
    }
  } catch (error) {
    console.error('Error loading user registration chart:', error);
    // Create placeholder chart with sample data
    createUserRegistrationChart([
      { date: '2024-01', count: 5 },
      { date: '2024-02', count: 8 },
      { date: '2024-03', count: 12 },
      { date: '2024-04', count: 15 },
      { date: '2024-05', count: 20 }
    ]);
  }
}

function createUserRegistrationChart(data) {
  const ctx = document.getElementById('userRegistrationChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: 'User Registrations',
        data: data.map(d => d.count),
        borderColor: 'rgb(13, 110, 253)',
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

async function loadWorkoutCategoryChart() {
  try {
    const response = await fetch(`${API_URL}/admin/workout-categories`, {
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      const data = await response.json();
      createWorkoutCategoryChart(data);
    }
  } catch (error) {
    console.error('Error loading workout category chart:', error);
    // Create placeholder chart with sample data
    createWorkoutCategoryChart([
      { category: 'Cardio', count: 5 },
      { category: 'Strength', count: 8 },
      { category: 'Flexibility', count: 3 },
      { category: 'HIIT', count: 6 },
      { category: 'Core', count: 4 }
    ]);
  }
}

function createWorkoutCategoryChart(data) {
  const ctx = document.getElementById('workoutCategoryChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.category),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: [
          'rgba(13, 110, 253, 0.8)',
          'rgba(25, 135, 84, 0.8)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(220, 53, 69, 0.8)',
          'rgba(13, 202, 240, 0.8)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right'
        }
      }
    }
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

function showAlert(elementId, message, type) {
  const alert = document.getElementById(elementId);
  if (!alert) return;
  
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alert.classList.remove('d-none');
  
  setTimeout(() => {
    alert.classList.add('d-none');
  }, 5000);
}

// Export functions for use in other scripts
window.checkAuth = checkAuth;
window.getAuthHeaders = getAuthHeaders;
window.logout = logout;
window.formatDate = formatDate;
window.showAlert = showAlert;