document.getElementById('bmiForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const weight = document.getElementById('bmiWeight').value;
  const height = document.getElementById('bmiHeight').value;
  
  try {
    const response = await fetch(`${API_URL}/calculators/bmi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight, height })
    });
    
    if (response.ok) {
      const data = await response.json();
      document.getElementById('bmiResult').innerHTML = `
        <div class="alert alert-info">
          <h5>Your BMI: ${data.bmi}</h5>
          <p class="mb-0">Category: ${data.category}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error calculating BMI:', error);
  }
});

// Calorie Calculator
document.getElementById('calorieForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const calcData = {
    weight: document.getElementById('calWeight').value,
    height: document.getElementById('calHeight').value,
    age: document.getElementById('calAge').value,
    gender: document.getElementById('calGender').value,
    activity_level: document.getElementById('activityLevel').value
  };
  
  try {
    const response = await fetch(`${API_URL}/calculators/calories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calcData)
    });
    
    if (response.ok) {
      const data = await response.json();
      document.getElementById('calorieResult').innerHTML = `
        <div class="alert alert-success">
          <h5>Your Daily Calorie Needs:</h5>
          <ul class="mb-0">
            <li>BMR: ${data.bmr} kcal</li>
            <li>Maintenance: ${data.dailyCalories} kcal</li>
            <li>Weight Loss: ${data.weightLoss} kcal</li>
            <li>Weight Gain: ${data.weightGain} kcal</li>
          </ul>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error calculating calories:', error);
  }
});
