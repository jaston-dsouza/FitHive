require("dotenv").config();

// FITHIVE BACKEND SERVER
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../frontend")));

// Database Connection
const db = mysql.createConnection({
  host: process.env.MYSQLHOST || process.env.DB_HOST || "localhost",
  user: process.env.MYSQLUSER || process.env.DB_USER || "root",
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || "",
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || "fithive",
  port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3307),
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to MySQL database");
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

// USER REGISTRATION
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password, full_name, age, gender, height } =
    req.body;
  if (!username || !email || !password || !full_name) {
    return res.status(400).json({ error: "Required fields missing" });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query =
      "INSERT INTO users (username, email, password_hash, full_name, age, gender, height) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(
      query,
      [username, email, hashedPassword, full_name, age, gender, height],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res
              .status(400)
              .json({ error: "Username or email already exists" });
          return res.status(500).json({ error: "Registration failed" });
        }
        res.status(201).json({
          message: "User registered successfully",
          userId: result.insertId,
        });
      },
    );
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// USER LOGIN
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err || results.length === 0)
        return res.status(401).json({ error: "Invalid credentials" });
      const user = results[0];
      if (!user.is_active)
        return res.status(401).json({ error: "Account deactivated" });

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword)
        return res.status(401).json({ error: "Invalid credentials" });

      db.query("UPDATE users SET last_login = NOW() WHERE user_id = ?", [
        user.user_id,
      ]);
      const token = jwt.sign(
        {
          userId: user.user_id,
          email: user.email,
          isAdmin: user.is_admin || false,
        },
        JWT_SECRET,
        { expiresIn: "24h" },
      );

      res.json({
        message: "Login successful",
        token,
        user: {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          isAdmin: user.is_admin || false,
        },
      });
    },
  );
});

// GET USER PROFILE
app.get("/api/users/profile", authenticateToken, (req, res) => {
  db.query(
    "SELECT user_id, username, email, full_name, age, gender, height, created_at FROM users WHERE user_id = ?",
    [req.user.userId],
    (err, results) => {
      if (err || results.length === 0)
        return res.status(404).json({ error: "User not found" });
      res.json(results[0]);
    },
  );
});

// UPDATE USER PROFILE
app.put("/api/users/profile", authenticateToken, (req, res) => {
  const { full_name, age, gender, height } = req.body;
  db.query(
    "UPDATE users SET full_name = ?, age = ?, gender = ?, height = ? WHERE user_id = ?",
    [full_name, age, gender, height, req.user.userId],
    (err) => {
      if (err) return res.status(500).json({ error: "Update failed" });
      res.json({ message: "Profile updated successfully" });
    },
  );
});

// CREATE GOAL
app.post("/api/goals", authenticateToken, (req, res) => {
  const { goal_type, target_weight, current_weight, target_date } = req.body;

  const start_weight = current_weight; // save first weight as start weight

  const query = `
    INSERT INTO fitness_goals 
    (user_id, goal_type, start_weight, current_weight, target_weight, target_date) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      req.user.userId,
      goal_type,
      start_weight,
      current_weight,
      target_weight,
      target_date,
    ],
    (err, result) => {
      if (err) {
        console.error("Goal create error:", err);
        return res.status(500).json({ error: "Failed to create goal" });
      }

      res.status(201).json({
        message: "Goal created successfully",
        goalId: result.insertId,
      });
    },
  );
});

// DELETE GOAL
app.delete("/api/goals/:goalId", authenticateToken, (req, res) => {
  const goalId = req.params.goalId;

  db.query(
    "DELETE FROM fitness_goals WHERE goal_id = ? AND user_id = ?",
    [goalId, req.user.userId],
    (err, result) => {
      if (err) {
        console.error("Delete goal error:", err);
        return res.status(500).json({ error: "Failed to delete goal" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Goal not found" });
      }

      res.json({ message: "Goal deleted successfully" });
    },
  );
});

// UPDATE GOAL
app.put("/api/goals/:goalId", authenticateToken, (req, res) => {
  const goalId = req.params.goalId;
  const { current_weight } = req.body;
  const userId = req.user.userId;

  // Update goal
  db.query(
    `UPDATE fitness_goals 
     SET current_weight = ? 
     WHERE goal_id = ? AND user_id = ?`,
    [current_weight, goalId, userId],
    (err) => {
      if (err) {
        console.error("Goal update error:", err);
        return res.status(500).json({ error: "Failed to update goal" });
      }

      // Also log progress
      db.query(
        `INSERT INTO progress_tracking (user_id, date, weight)
         VALUES (?, CURDATE(), ?)`,
        [userId, current_weight],
        (err2) => {
          if (err2) {
            console.error("Progress log error:", err2);
          }

          res.json({ message: "Goal updated and progress logged" });
        },
      );
    },
  );
});

// GET USER GOALS
app.get("/api/goals", authenticateToken, (req, res) => {
  db.query(
    "SELECT * FROM fitness_goals WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Failed to fetch goals" });
      res.json(results);
    },
  );
});

app.get("/api/progress/latest-weight", authenticateToken, (req, res) => {
  const query = `
  SELECT weight, date, created_at
  FROM progress_tracking
  WHERE user_id = ? AND weight IS NOT NULL
  ORDER BY date DESC, created_at DESC
  LIMIT 2
`;

  db.query(query, [req.user.userId], (err, results) => {
    if (err) {
      console.error("Latest weight error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.json({ current: null });
    }

    const current = results[0].weight;
    const previous = results[1]?.weight || null;

    let difference = null;

    if (previous !== null) {
      difference = (current - previous).toFixed(1);
    }

    res.json({
      current,
      previous,
      difference,
    });
  });
});

// GET WORKOUTS
app.get("/api/workouts", (req, res) => {
  const { difficulty, category } = req.query;
  let query = "SELECT * FROM workouts WHERE is_active = TRUE";
  const params = [];
  if (difficulty) {
    query += " AND difficulty_level = ?";
    params.push(difficulty);
  }
  if (category) {
    query += " AND category = ?";
    params.push(category);
  }
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch workouts" });
    res.json(results);
  });
});

// SEARCH WORKOUTS
app.get("/api/workouts/search/:term", (req, res) => {
  const searchTerm = `%${req.params.term}%`;
  db.query(
    "SELECT * FROM workouts WHERE (workout_name LIKE ? OR description LIKE ?) AND is_active = TRUE",
    [searchTerm, searchTerm],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Search failed" });
      res.json(results);
    },
  );
});

// GET EXERCISES
app.get("/api/exercises", (req, res) => {
  db.query("SELECT * FROM exercises", (err, results) => {
    if (err)
      return res.status(500).json({ error: "Failed to fetch exercises" });
    res.json(results);
  });
});

// LOG PROGRESS
app.post("/api/progress", authenticateToken, (req, res) => {
  const {
    date,
    weight,
    calories_consumed,
    calories_burned,
    workout_duration,
    notes,
  } = req.body;
  db.query(
    "INSERT INTO progress_tracking (user_id, date, weight, calories_consumed, calories_burned, workout_duration, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      req.user.userId,
      date,
      weight,
      calories_consumed,
      calories_burned,
      workout_duration,
      notes,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to log progress" });
      res
        .status(201)
        .json({ message: "Progress logged", trackingId: result.insertId });
    },
  );
});

// GET PROGRESS
app.get("/api/progress", authenticateToken, (req, res) => {
  const { start_date, end_date } = req.query;
  let query = "SELECT * FROM progress_tracking WHERE user_id = ?";
  const params = [req.user.userId];
  if (start_date && end_date) {
    query += " AND date BETWEEN ? AND ?";
    params.push(start_date, end_date);
  }
  query += " ORDER BY date DESC, created_at DESC";
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch progress" });
    res.json(results);
  });
});

// GET PROGRESS ANALYTICS
app.get("/api/progress/analytics", authenticateToken, (req, res) => {
  const userId = req.user.userId;

  const query = `
    SELECT 
      COUNT(*) AS total_sessions,
      SUM(duration) AS total_minutes,
      SUM(calories) AS total_calories,
      AVG(calories) AS avg_calories_per_session
    FROM workout_logs
    WHERE user_id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Workout analytics error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results[0]);
  });
});

app.get("/api/progress/weekly-calories", authenticateToken, (req, res) => {
  const userId = req.user.userId;

  const query = `
    SELECT 
      SUM(CASE 
        WHEN created_at >= NOW() - INTERVAL 7 DAY 
        THEN calories ELSE 0 END) AS this_week,
      SUM(CASE 
        WHEN created_at BETWEEN NOW() - INTERVAL 14 DAY 
        AND NOW() - INTERVAL 7 DAY 
        THEN calories ELSE 0 END) AS last_week
    FROM workout_logs
    WHERE user_id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results[0]);
  });
});

// GET ARTICLES
app.get("/api/articles", (req, res) => {
  db.query(
    "SELECT * FROM articles WHERE is_published = TRUE ORDER BY created_at DESC",
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Failed to fetch articles" });
      res.json(results);
    },
  );
});

// GET CHALLENGES
app.get("/api/challenges", (req, res) => {
  db.query(
    "SELECT * FROM challenges WHERE is_active = TRUE AND end_date >= CURDATE() ORDER BY start_date",
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Failed to fetch challenges" });
      res.json(results);
    },
  );
});

// BMI CALCULATOR
app.post("/api/calculators/bmi", (req, res) => {
  const { weight, height } = req.body;
  if (!weight || !height)
    return res.status(400).json({ error: "Weight and height required" });
  const heightInMeters = height / 100;
  const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(2);
  let category =
    bmi < 18.5
      ? "Underweight"
      : bmi < 25
        ? "Normal weight"
        : bmi < 30
          ? "Overweight"
          : "Obese";
  res.json({ bmi: parseFloat(bmi), category });
});

// CALORIE CALCULATOR
app.post("/api/calculators/calories", (req, res) => {
  const { weight, height, age, gender, activity_level } = req.body;
  if (!weight || !height || !age || !gender)
    return res.status(400).json({ error: "All fields required" });
  let bmr =
    gender === "Male"
      ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
      : 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const dailyCalories = Math.round(bmr * (multipliers[activity_level] || 1.2));
  res.json({
    bmr: Math.round(bmr),
    dailyCalories,
    weightLoss: dailyCalories - 500,
    weightGain: dailyCalories + 500,
  });
});

app.post("/api/workout-logs", authenticateToken, (req, res) => {
  const { workout_name, duration, calories } = req.body;

  const user_id = req.user.userId; // ✅ correct JWT user ID

  const query = `
    INSERT INTO workout_logs (user_id, workout_name, duration, calories)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [user_id, workout_name, duration, calories], (err) => {
    if (err) {
      console.error("Workout log error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ message: "Workout logged successfully" });
  });
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

// ADMIN ANALYTICS
app.get("/api/admin/analytics", authenticateToken, (req, res) => {
  const queries = [
    "SELECT COUNT(*) as totalUsers FROM users",
    "SELECT COUNT(*) as activeUsers FROM users WHERE is_active = TRUE",
    "SELECT COUNT(*) as totalWorkouts FROM workouts",
    "SELECT COUNT(*) as totalArticles FROM articles",
  ];

  Promise.all(
    queries.map(
      (query) =>
        new Promise((resolve, reject) => {
          db.query(query, (err, results) => {
            if (err) reject(err);
            else resolve(results[0]);
          });
        }),
    ),
  )
    .then((results) => {
      res.json({
        totalUsers: results[0].totalUsers,
        activeUsers: results[1].activeUsers,
        totalWorkouts: results[2].totalWorkouts,
        totalArticles: results[3].totalArticles,
      });
    })
    .catch((err) =>
      res.status(500).json({ error: "Failed to fetch analytics" }),
    );
});

// GET ALL USERS (ADMIN)
app.get("/api/admin/users", authenticateToken, (req, res) => {
  const limit = req.query.limit || 1000;
  db.query(
    "SELECT user_id, username, email, full_name, age, gender, height, created_at, updated_at, last_login, is_active FROM users ORDER BY created_at ASC LIMIT ?",
    [parseInt(limit)],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Failed to fetch users" });
      res.json(results);
    },
  );
});

app.get("/api/admin/users/recent", authenticateToken, (req, res) => {
  const limit = req.query.limit || 1000;
  db.query(
    "SELECT user_id, username, email, full_name, age, gender, height, created_at, updated_at, last_login, is_active FROM users ORDER BY created_at DESC LIMIT ?",
    [parseInt(limit)],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Failed to fetch users" });
      res.json(results);
    },
  );
});

// GET SINGLE USER (ADMIN)
app.get("/api/admin/users/:userId", authenticateToken, (req, res) => {
  const userId = req.params.userId;
  const userQuery =
    "SELECT user_id, username, email, full_name, age, gender, height, created_at, updated_at, last_login, is_active FROM users WHERE user_id = ?";
  const goalsQuery =
    "SELECT COUNT(*) as total_goals FROM fitness_goals WHERE user_id = ?";
  const progressQuery =
    "SELECT COUNT(*) as total_progress FROM progress_tracking WHERE user_id = ?";

  db.query(userQuery, [userId], (err, userResults) => {
    if (err || userResults.length === 0)
      return res.status(404).json({ error: "User not found" });

    const user = userResults[0];

    db.query(goalsQuery, [userId], (err, goalsResults) => {
      user.total_goals = goalsResults[0].total_goals;

      db.query(progressQuery, [userId], (err, progressResults) => {
        user.total_progress = progressResults[0].total_progress;
        res.json(user);
      });
    });
  });
});

// ACTIVATE/DEACTIVATE USER
app.put("/api/admin/users/:userId/:action", authenticateToken, (req, res) => {
  const userId = req.params.userId;
  const action = req.params.action;
  const isActive = action === "activate" ? 1 : 0;

  db.query(
    "UPDATE users SET is_active = ? WHERE user_id = ?",
    [isActive, userId],
    (err) => {
      if (err)
        return res.status(500).json({ error: "Failed to update user status" });
      res.json({ message: `User ${action}d successfully` });
    },
  );
});

app.get("/api/admin/active-users", authenticateToken, (req, res) => {
  const query = `
    SELECT COUNT(DISTINCT user_id) AS active_users
    FROM workout_logs
    WHERE created_at >= NOW() - INTERVAL 7 DAY
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Active users error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results[0]);
  });
});

app.get("/api/admin/total-workouts", authenticateToken, (req, res) => {
  const query = `
    SELECT COUNT(*) AS total_workouts
    FROM workouts
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Total workouts error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results[0]);
  });
});

app.get("/api/admin/recent-activity", authenticateToken, (req, res) => {
  const queries = [
    `SELECT 'user' AS type, username AS title, created_at 
     FROM users ORDER BY created_at DESC LIMIT 5`,

    `SELECT 'workout' AS type, workout_name AS title, created_at 
     FROM workouts ORDER BY created_at DESC LIMIT 5`,

    `SELECT 'article' AS type, title, created_at 
     FROM articles ORDER BY created_at DESC LIMIT 5`,

    `SELECT 'challenge' AS type, challenge_name AS title, created_at 
     FROM challenges ORDER BY created_at DESC LIMIT 5`,
  ];

  Promise.all(
    queries.map(
      (q) =>
        new Promise((resolve, reject) => {
          db.query(q, (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        }),
    ),
  )
    .then((results) => {
      const merged = results.flat();
      merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      res.json(merged.slice(0, 8)); // return latest 8 activities
    })
    .catch((err) => {
      console.error("Recent activity error:", err);
      res.status(500).json({ error: "Failed to fetch activity" });
    });
});

// GET ALL WORKOUTS (ADMIN)
app.get("/api/admin/workouts", authenticateToken, (req, res) => {
  db.query("SELECT * FROM workouts ORDER BY created_at ASC", (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch workouts" });
    res.json(results);
  });
});

// CREATE WORKOUT (ADMIN)
app.post("/api/admin/workouts", authenticateToken, (req, res) => {
  const {
    workout_name,
    description,
    difficulty_level,
    duration_minutes,
    calories_burned,
    category,
    is_active,
  } = req.body;

  db.query(
    "INSERT INTO workouts (workout_name, description, difficulty_level, duration_minutes, calories_burned, category, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      workout_name,
      description,
      difficulty_level,
      duration_minutes,
      calories_burned,
      category,
      is_active ? 1 : 0,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Failed to create workout" });
      res
        .status(201)
        .json({ message: "Workout created", workoutId: result.insertId });
    },
  );
});

// UPDATE WORKOUT (ADMIN)
app.put("/api/admin/workouts/:workoutId", authenticateToken, (req, res) => {
  const workoutId = req.params.workoutId;
  const {
    workout_name,
    description,
    difficulty_level,
    duration_minutes,
    calories_burned,
    category,
    is_active,
  } = req.body;

  db.query(
    "UPDATE workouts SET workout_name = ?, description = ?, difficulty_level = ?, duration_minutes = ?, calories_burned = ?, category = ?, is_active = ? WHERE workout_id = ?",
    [
      workout_name,
      description,
      difficulty_level,
      duration_minutes,
      calories_burned,
      category,
      is_active ? 1 : 0,
      workoutId,
    ],
    (err) => {
      if (err)
        return res.status(500).json({ error: "Failed to update workout" });
      res.json({ message: "Workout updated successfully" });
    },
  );
});

// TOGGLE WORKOUT STATUS
app.put(
  "/api/admin/workouts/:workoutId/toggle",
  authenticateToken,
  (req, res) => {
    const workoutId = req.params.workoutId;

    db.query(
      "UPDATE workouts SET is_active = NOT is_active WHERE workout_id = ?",
      [workoutId],
      (err) => {
        if (err)
          return res
            .status(500)
            .json({ error: "Failed to toggle workout status" });
        res.json({ message: "Workout status toggled" });
      },
    );
  },
);

// DELETE WORKOUT (ADMIN)
app.delete("/api/admin/workouts/:workoutId", authenticateToken, (req, res) => {
  const workoutId = req.params.workoutId;

  db.query("DELETE FROM workouts WHERE workout_id = ?", [workoutId], (err) => {
    if (err) return res.status(500).json({ error: "Failed to delete workout" });
    res.json({ message: "Workout deleted successfully" });
  });
});

// GET ALL ARTICLES (ADMIN)
app.get("/api/admin/articles", authenticateToken, (req, res) => {
  db.query("SELECT * FROM articles ORDER BY created_at ASC", (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch articles" });
    res.json(results);
  });
});

// CREATE ARTICLE (ADMIN)
app.post("/api/admin/articles", authenticateToken, (req, res) => {
  const { title, content, author, category, image_url, is_published } =
    req.body;

  db.query(
    "INSERT INTO articles (title, content, author, category, image_url, is_published) VALUES (?, ?, ?, ?, ?, ?)",
    [title, content, author, category, image_url, is_published ? 1 : 0],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Failed to create article" });
      res
        .status(201)
        .json({ message: "Article created", articleId: result.insertId });
    },
  );
});

// UPDATE ARTICLE (ADMIN)
app.put("/api/admin/articles/:articleId", authenticateToken, (req, res) => {
  const articleId = req.params.articleId;
  const { title, content, author, category, image_url, is_published } =
    req.body;

  db.query(
    "UPDATE articles SET title = ?, content = ?, author = ?, category = ?, image_url = ?, is_published = ? WHERE article_id = ?",
    [
      title,
      content,
      author,
      category,
      image_url,
      is_published ? 1 : 0,
      articleId,
    ],
    (err) => {
      if (err)
        return res.status(500).json({ error: "Failed to update article" });
      res.json({ message: "Article updated successfully" });
    },
  );
});

// TOGGLE ARTICLE STATUS
app.put(
  "/api/admin/articles/:articleId/toggle",
  authenticateToken,
  (req, res) => {
    const articleId = req.params.articleId;

    db.query(
      "UPDATE articles SET is_published = NOT is_published WHERE article_id = ?",
      [articleId],
      (err) => {
        if (err)
          return res
            .status(500)
            .json({ error: "Failed to toggle article status" });
        res.json({ message: "Article status toggled" });
      },
    );
  },
);

// DELETE ARTICLE (ADMIN)
app.delete("/api/admin/articles/:articleId", authenticateToken, (req, res) => {
  const articleId = req.params.articleId;

  db.query("DELETE FROM articles WHERE article_id = ?", [articleId], (err) => {
    if (err) return res.status(500).json({ error: "Failed to delete article" });
    res.json({ message: "Article deleted successfully" });
  });
});

// GET ALL CHALLENGES (ADMIN)
app.get("/api/admin/challenges", authenticateToken, (req, res) => {
  db.query(
    "SELECT * FROM challenges ORDER BY created_at ASC",
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Failed to fetch challenges" });
      res.json(results);
    },
  );
});

// CREATE CHALLENGE (ADMIN)
app.post("/api/admin/challenges", authenticateToken, (req, res) => {
  const {
    challenge_name,
    description,
    start_date,
    end_date,
    target_metric,
    target_value,
    reward_points,
    is_active,
  } = req.body;

  db.query(
    "INSERT INTO challenges (challenge_name, description, start_date, end_date, target_metric, target_value, reward_points, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      challenge_name,
      description,
      start_date,
      end_date,
      target_metric,
      target_value,
      reward_points,
      is_active ? 1 : 0,
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Failed to create challenge" });
      res
        .status(201)
        .json({ message: "Challenge created", challengeId: result.insertId });
    },
  );
});

// UPDATE CHALLENGE (ADMIN)
app.put("/api/admin/challenges/:challengeId", authenticateToken, (req, res) => {
  const challengeId = req.params.challengeId;
  const {
    challenge_name,
    description,
    start_date,
    end_date,
    target_metric,
    target_value,
    reward_points,
    is_active,
  } = req.body;

  db.query(
    "UPDATE challenges SET challenge_name = ?, description = ?, start_date = ?, end_date = ?, target_metric = ?, target_value = ?, reward_points = ?, is_active = ? WHERE challenge_id = ?",
    [
      challenge_name,
      description,
      start_date,
      end_date,
      target_metric,
      target_value,
      reward_points,
      is_active ? 1 : 0,
      challengeId,
    ],
    (err) => {
      if (err)
        return res.status(500).json({ error: "Failed to update challenge" });
      res.json({ message: "Challenge updated successfully" });
    },
  );
});

// TOGGLE CHALLENGE STATUS
app.put(
  "/api/admin/challenges/:challengeId/toggle",
  authenticateToken,
  (req, res) => {
    const challengeId = req.params.challengeId;

    db.query(
      "UPDATE challenges SET is_active = NOT is_active WHERE challenge_id = ?",
      [challengeId],
      (err) => {
        if (err)
          return res
            .status(500)
            .json({ error: "Failed to toggle challenge status" });
        res.json({ message: "Challenge status toggled" });
      },
    );
  },
);

// DELETE CHALLENGE (ADMIN)
app.delete(
  "/api/admin/challenges/:challengeId",
  authenticateToken,
  (req, res) => {
    const challengeId = req.params.challengeId;

    db.query(
      "DELETE FROM challenges WHERE challenge_id = ?",
      [challengeId],
      (err) => {
        if (err)
          return res.status(500).json({ error: "Failed to delete challenge" });
        res.json({ message: "Challenge deleted successfully" });
      },
    );
  },
);

// USER REGISTRATION TREND
app.get("/api/admin/user-registration-trend", authenticateToken, (req, res) => {
  db.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') as date, COUNT(*) as count 
    FROM users 
    GROUP BY DATE_FORMAT(created_at, '%Y-%m') 
    ORDER BY date DESC 
    LIMIT 12`,
    (err, results) => {
      if (err) return res.status(500).json({ error: "Failed to fetch trend" });
      res.json(results.reverse());
    },
  );
});

// WORKOUT CATEGORIES
app.get("/api/admin/workout-categories", authenticateToken, (req, res) => {
  db.query(
    "SELECT category, COUNT(*) as count FROM workouts GROUP BY category",
    (err, results) => {
      if (err)
        return res.status(500).json({ error: "Failed to fetch categories" });
      res.json(results);
    },
  );
});

// SERVE HTML FILES
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend", "index.html")),
);
app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend", "login.html")),
);
app.get("/register", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend", "register.html")),
);
app.get("/dashboard", (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend", "dashboard.html")),
);

// START SERVER
app.listen(PORT, () => {
  console.log("");
  console.log("╔═══════════════════════════════════╗");
  console.log("║   🏋️  FITHIVE SERVER RUNNING  🏋️    ║");
  console.log("╚═══════════════════════════════════╝");
  console.log("");
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔧 Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log("");
});
