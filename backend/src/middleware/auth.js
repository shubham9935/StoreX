const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.userId,
      role: decoded.role,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
