
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const crypto = require('crypto');
require('dotenv').config();

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.user_id,
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
};

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

// Verify Resend API key on startup
if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your-resend-api-key-here') {
  console.log('✅ Resend email service initialized');
} else {
  console.warn('⚠️  RESEND_API_KEY not configured - email features will not work');
}

// Register a new user
exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const userExist = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const bcryptPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, 'user') RETURNING *",
      [username, email, bcryptPassword]
    );

    const token = generateToken(newUser.rows[0]);
    const { password: _, ...userData } = newUser.rows[0];

    console.log(`👤 New User Registered: ${username} (${email})`);

    res.json({ token, user: userData });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Authenticate user and return JWT token
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  try {
    const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email" });
    }

    const user = userRes.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      console.log(`❌ Failed Login Attempt: ${email}`);
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = generateToken(user);
    const { password: _, ...userData } = user;

    console.log(`✅ User Logged In: ${user.username} (${user.email})`);

    res.json({ token, user: userData });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get current authenticated user's profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found in token" });
    }

    const result = await pool.query(
      `SELECT user_id, username, email, created_at, role, borrow_limit,
              first_name as "firstName", last_name as "lastName", mobile, gender, address
       FROM users WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update user profile details
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;

    const { firstName, lastName, mobile, gender, address } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found in token" });
    }


    const update = await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, mobile = $3, gender = $4, address = $5
       WHERE user_id = $6 
       RETURNING user_id, username, email, first_name, last_name, mobile, gender, address`,
      [firstName, lastName, mobile, gender, address, userId]
    );

    if (update.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }


    const u = update.rows[0];
    res.json({
      ...u,
      firstName: u.first_name,
      lastName: u.last_name
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Change user password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "User ID not found in token" });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both passwords are required" });
    }

    const user = await pool.query(
      "SELECT password FROM users WHERE user_id = $1",
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(currentPassword, user.rows[0].password);

    if (!valid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE users SET password = $1 WHERE user_id = $2",
      [hash, userId]
    );

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Initiate password reset process via email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    console.log(`📧 Password reset requested for: ${email}`);

    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (user.rows.length === 0) {
      console.log(`⚠️  Email not found in database: ${email}`);
      return res.json({ message: "If the email exists, a reset link has been sent" });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpire = new Date(Date.now() + 3600000);

    await pool.query(
      "UPDATE users SET reset_token = $1, reset_token_expire = $2 WHERE user_id = $3",
      [resetTokenHash, resetTokenExpire, user.rows[0].user_id]
    );

    console.log(`🔑 Reset token generated for user: ${user.rows[0].username}`);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    console.log(`📬 Sending reset email to: ${email}`);
    console.log(`📬 From: onboarding@resend.dev`);
    console.log(`📬 Reset URL: ${resetUrl}`);

    try {
      const result = await resend.emails.send({
        from: "ShelfShare <onboarding@resend.dev>",
        to: email,
        subject: '🔐 Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0770ad;">Reset Your Password</h2>
            <p>You requested a password reset. Click the button below to reset your password:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0770ad; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Reset Password</a>
            <p style="color: #666;">Or copy this link: <br><a href="${resetUrl}">${resetUrl}</a></p>
            <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
            <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        `
      });

      console.log(`✅ Resend API Response:`, result);
      console.log(`✅ Password reset email sent successfully to: ${email}`);
    } catch (emailError) {
      console.error(`❌ Resend API Error:`, emailError);
      console.error(`❌ Error details:`, {
        message: emailError.message,
        name: emailError.name,
        statusCode: emailError.statusCode
      });
      throw emailError;
    }

    res.json({ message: "If the email exists, a reset link has been sent" });

  } catch (err) {
    console.error('❌ Forgot password error:', err);
    console.error('Error details:', {
      message: err.message,
      name: err.name
    });
    res.status(500).json({ message: "Failed to send reset email" });
  }
};

// Reset password using valid token
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await pool.query(
      "SELECT * FROM users WHERE reset_token = $1 AND reset_token_expire > NOW()",
      [resetTokenHash]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password = $1, reset_token = NULL, reset_token_expire = NULL WHERE user_id = $2",
      [hash, user.rows[0].user_id]
    );

    res.json({ message: "Password reset successfully" });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: "Failed to reset password" });
  }
};
// Subscribe email to newsletter
exports.subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }


    const existing = await pool.query(
      "SELECT * FROM newsletter_subscribers WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "This email is already subscribed" });
    }


    await pool.query(
      "INSERT INTO newsletter_subscribers (email, subscribed_at) VALUES ($1, NOW())",
      [email]
    );


    await resend.emails.send({
      from: "ShelfShare <onboarding@resend.dev>",
      to: email,
      subject: '🎉 Welcome to ShelfShare Newsletter!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0770ad; margin: 0;">📚 ShelfShare</h1>
            <p style="color: #666; margin-top: 10px;">Your Personal Library Hub</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #0770ad 0%, #055a8c 100%); padding: 30px; border-radius: 12px; color: white; text-align: center;">
            <h2 style="margin: 0 0 15px 0;">Thank You for Subscribing! 🎉</h2>
            <p style="margin: 0; font-size: 16px; line-height: 1.6;">
              You'll now receive the latest book recommendations, platform updates, 
              and exclusive content delivered straight to your inbox.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px;">
            <h3 style="color: #0770ad; margin-top: 0;">What to Expect:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>📖 Curated book recommendations based on trending genres</li>
              <li>✨ New feature announcements and platform updates</li>
              <li>🎯 Personalized reading suggestions</li>
              <li>🏆 Monthly top books and authors highlights</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              If you wish to unsubscribe, you can do so at any time by clicking the unsubscribe link in our emails.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 15px;">
              © ${new Date().getFullYear()} ShelfShare. All rights reserved.
            </p>
          </div>
        </div>
      `
    });

    res.json({
      message: "Successfully subscribed! Check your email for confirmation.",
      email
    });

  } catch (err) {
    console.error('Newsletter subscription error:', err);
    res.status(500).json({ message: `Failed to subscribe: ${err.message}` });
  }
};