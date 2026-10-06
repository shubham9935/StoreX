const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/test', requireAuth, requireRole('ADMIN'), (req, res) => {
  res.status(200).json({
    message: 'Admin access granted',
    user: {
      id: req.user.id,
      role: req.user.role,
    },
  });
});

module.exports = router;
