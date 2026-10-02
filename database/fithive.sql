CREATE DATABASE IF NOT EXISTS fithive;
USE fithive;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  age INT,
  gender ENUM('Male', 'Female', 'Other'),
  height DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Fitness Goals Table
CREATE TABLE IF NOT EXISTS fitness_goals (
  goal_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  goal_type ENUM('Weight Loss', 'Muscle Gain', 'General Fitness') NOT NULL,
  target_weight DECIMAL(5,2),
  current_weight DECIMAL(5,2),
  target_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Active', 'Completed', 'Abandoned') DEFAULT 'Active',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Workouts Table
CREATE TABLE IF NOT EXISTS workouts (
  workout_id INT PRIMARY KEY AUTO_INCREMENT,
  workout_name VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty_level ENUM('Beginner', 'Intermediate', 'Advanced') NOT NULL,
  duration_minutes INT,
  calories_burned INT,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Exercises Table
CREATE TABLE IF NOT EXISTS exercises (
  exercise_id INT PRIMARY KEY AUTO_INCREMENT,
  exercise_name VARCHAR(255) NOT NULL,
  description TEXT,
  video_url VARCHAR(500),
  image_url VARCHAR(500),
  muscle_group VARCHAR(100),
  equipment_needed VARCHAR(255),
  difficulty_level ENUM('Beginner', 'Intermediate', 'Advanced'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Progress Tracking Table
CREATE TABLE IF NOT EXISTS progress_tracking (
  tracking_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  weight DECIMAL(5,2),
  calories_consumed INT,
  calories_burned INT,
  workout_duration INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Articles Table
CREATE TABLE IF NOT EXISTS articles (
  article_id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author VARCHAR(255),
  category VARCHAR(100),
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_published BOOLEAN DEFAULT FALSE
);

-- Challenges Table
CREATE TABLE IF NOT EXISTS challenges (
  challenge_id INT PRIMARY KEY AUTO_INCREMENT,
  challenge_name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_metric VARCHAR(100),
  target_value INT,
  reward_points INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Admin Table
CREATE TABLE IF NOT EXISTS admin (
  admin_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NOT NULL,
  admin_role ENUM('Super Admin', 'Content Manager', 'User Manager') NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_access TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Insert Sample Data

-- Sample Workouts
INSERT INTO workouts (workout_name, description, difficulty_level, duration_minutes, calories_burned, category) VALUES
('Morning Cardio Blast', 'High-intensity cardio workout to start your day', 'Beginner', 30, 250, 'Cardio'),
('Full Body Strength', 'Complete strength training for all muscle groups', 'Intermediate', 45, 350, 'Strength'),
('Yoga Flow', 'Relaxing yoga sequence for flexibility', 'Beginner', 40, 150, 'Flexibility'),
('HIIT Power Session', 'High intensity interval training', 'Advanced', 30, 400, 'HIIT'),
('Core Crusher', 'Intensive core strengthening workout', 'Intermediate', 25, 200, 'Core');

-- Sample Exercises
INSERT INTO exercises (exercise_name, description, muscle_group, equipment_needed, difficulty_level) VALUES
('Push-ups', 'Classic upper body exercise', 'Chest', 'None', 'Beginner'),
('Squats', 'Lower body compound movement', 'Legs', 'None', 'Beginner'),
('Plank', 'Core stability exercise', 'Core', 'None', 'Beginner'),
('Burpees', 'Full body cardio exercise', 'Full Body', 'None', 'Intermediate'),
('Pull-ups', 'Upper body pulling exercise', 'Back', 'Pull-up Bar', 'Advanced');

-- Sample Articles
INSERT INTO articles (title, content, author, category, is_published) VALUES
('10 Tips for Weight Loss Success', 'Discover the top strategies for sustainable weight loss...', 'Dr. Sarah Johnson', 'Weight Loss', TRUE),
('Building Muscle: A Beginner\'s Guide', 'Learn the fundamentals of muscle building...', 'Coach Mike Stevens', 'Muscle Gain', TRUE),
('The Importance of Rest Days', 'Why recovery is crucial for fitness progress...', 'Dr. Sarah Johnson', 'General Fitness', TRUE),
('Nutrition Basics for Athletes', 'Essential nutrition information for optimal performance...', 'Nutritionist Amy Lee', 'Nutrition', TRUE),
('Home Workout Equipment Guide', 'Must-have equipment for effective home workouts...', 'Coach Mike Stevens', 'Equipment', TRUE);

-- Sample Challenges
INSERT INTO challenges (challenge_name, description, start_date, end_date, target_metric, target_value, reward_points) VALUES
('30-Day Plank Challenge', 'Hold plank for increasing durations', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Plank Duration', 300, 100),
('Weekly Step Goal', 'Walk 10,000 steps daily', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Steps', 70000, 50),
('Hydration Challenge', 'Drink 8 glasses of water daily', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Water Intake', 112, 75);