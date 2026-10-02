// ============================================================================
// FITHIVE - CREATE ADMIN USER
// ============================================================================
// Usage: node create-admin.js

const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Database Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',  // XAMPP default is empty
  database: 'fithive',
  port: 3307
});

async function createAdminUser() {
  console.log('\n🔧 FitHive Admin User Creator\n');
  
  // First, add is_admin column if it doesn't exist
  db.query('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE', (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') {
      console.error('Error adding is_admin column:', err.message);
    } else if (err && err.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ is_admin column already exists');
    } else {
      console.log('✓ Added is_admin column to users table');
    }
  });
  
  rl.question('Enter admin username (default: admin): ', (username) => {
    username = username || 'admin';
    
    rl.question('Enter admin email (default: admin@fithive.com): ', (email) => {
      email = email || 'admin@fithive.com';
      
      rl.question('Enter admin password (default: admin123): ', (password) => {
        password = password || 'admin123';
        
        rl.question('Enter admin full name (default: Admin User): ', async (fullName) => {
          fullName = fullName || 'Admin User';
          
          console.log('\n📝 Creating admin user...');
          console.log(`Username: ${username}`);
          console.log(`Email: ${email}`);
          console.log(`Password: ${password}`);
          console.log(`Full Name: ${fullName}`);
          
          try {
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Insert admin user
            const query = `
              INSERT INTO users (username, email, password_hash, full_name, is_admin, is_active) 
              VALUES (?, ?, ?, ?, TRUE, TRUE)
              ON DUPLICATE KEY UPDATE 
                password_hash = VALUES(password_hash),
                is_admin = TRUE,
                full_name = VALUES(full_name)
            `;
            
            db.query(query, [username, email, hashedPassword, fullName], (err, result) => {
              if (err) {
                console.error('\n❌ Error creating admin user:', err.message);
              } else {
                console.log('\n✅ Admin user created successfully!');
                console.log('\n📌 Login credentials:');
                console.log(`   Email: ${email}`);
                console.log(`   Password: ${password}`);
                console.log('\n⚠️  Please change the password after first login!\n');
              }
              
              db.end();
              rl.close();
            });
          } catch (error) {
            console.error('\n❌ Error:', error.message);
            db.end();
            rl.close();
          }
        });
      });
    });
  });
}

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL database\n');
  createAdminUser();
});