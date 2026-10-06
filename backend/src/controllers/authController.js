const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  if (typeof password !== 'string') {
    return false;
  }

  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

function buildToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!trimmedName) {
      return res.status(400).json({ message: 'Name cannot be empty.' });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and contain uppercase, lowercase and a number.',
      });
    }

    const existingUser = await db.query('SELECT id FROM users WHERE lower(email) = $1 AND deleted_at IS NULL LIMIT 1', [normalizedEmail]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (display_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'USER')
       RETURNING id, display_name AS name, email, role, created_at`,
      [trimmedName, normalizedEmail, passwordHash]
    );

    const user = result.rows[0];

    return res.status(201).json({
      message: 'User registered successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const result = await db.query(
      `SELECT id, display_name, email, password_hash, role
       FROM users
       WHERE lower(email) = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [normalizedEmail]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = buildToken(user);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.display_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getCurrentUser(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, display_name AS name, email, role
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [req.user.id]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  getCurrentUser,
};
