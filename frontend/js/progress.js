document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.includes('progress.html')) {
    checkAuth();
    await loadProgressData();
    
    // Add form submit handler
    document.getElementById('progressForm')?.addEventListener('submit', handleProgressSubmit);
  }
});

async function handleProgressSubmit(e) {
  e.preventDefault();
  
  const progressData = {
    date: document.getElementById('date').value,
    weight: document.getElementById('weight').value,
    calories_consumed: document.getElementById('caloriesConsumed').value,
    calories_burned: null,
    workout_duration: document.getElementById('workoutDuration').value,
    notes: document.getElementById('notes').value
  };
  
  try {
    const response = await fetch(`${API_URL}/progress`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(progressData)
    });
    
    if (response.ok) {
      showAlert('progressAlert', 'Progress logged successfully!', 'success');
      document.getElementById('progressForm').reset();
      await loadProgressData();
    } else {
      const data = await response.json();
      showAlert('progressAlert', data.error || 'Failed to log progress', 'danger');
    }
  } catch (error) {
    showAlert('progressAlert', 'Network error. Please try again.', 'danger');
  }
}

let allProgressData = [];
let showingAll = false;

async function loadProgressData() {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const response = await fetch(
      `${API_URL}/progress?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`,
      { headers: getAuthHeaders() }
    );
    
    if (response.ok) {
      const progressData = await response.json();
      allProgressData = progressData;
      displayProgressTable(false); // show only 10 first
      progressData.sort((a, b) => new Date(a.date) - new Date(b.date));
      displayProgressCharts(progressData);
    }
  } catch (error) {
    console.error('Error loading progress data:', error);
  }
}

function formatDateDDMMYYYY(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}


function displayProgressTable(showAll) {
  const tbody = document.getElementById('progressTableBody');

  if (!allProgressData || allProgressData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted">No progress data available</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  const dataToShow = showAll
    ? allProgressData
    : allProgressData.slice(0, 10);

  dataToShow.forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDateDDMMYYYY(entry.date)}</td>
      <td>${entry.weight || '--'}</td>
      <td>${entry.calories_consumed || '--'}</td>
      <td>${entry.calories_burned || '--'}</td>
      <td>${entry.workout_duration || '--'}</td>
      <td><span class="text-muted small">${entry.notes || '--'}</span></td>
    `;
    tbody.appendChild(row);
  });

  const btn = document.getElementById('toggleHistoryBtn');
  if (btn) {
    btn.textContent = showAll ? "Show Less" : "See All";
  }

  showingAll = showAll;
}


function displayProgressCharts(progressData) {
  // Weight Chart
  const weightCtx = document.getElementById('weightChart')?.getContext('2d');
  if (weightCtx) {
    new Chart(weightCtx, {
      type: 'line',
      data: {
        labels: progressData.map(p => formatDateDDMMYYYY(p.date)),
        datasets: [{
          label: 'Weight (kg)',
          data: progressData.map(p => p.weight),
          borderColor: 'rgb(13, 110, 253)',
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
  
  // Calories Chart
  const caloriesCtx = document.getElementById('caloriesChart')?.getContext('2d');
  if (caloriesCtx) {
    new Chart(caloriesCtx, {
      type: 'bar',
      data: {
        labels: progressData.map(p => formatDateDDMMYYYY(p.date)),
        datasets: [
          {
            label: 'Consumed',
            data: progressData.map(p => p.calories_consumed),
            backgroundColor: 'rgba(255, 193, 7, 0.7)'
          },
          {
            label: 'Burned',
            data: progressData.map(p => p.calories_burned),
            backgroundColor: 'rgba(25, 135, 84, 0.7)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
}
