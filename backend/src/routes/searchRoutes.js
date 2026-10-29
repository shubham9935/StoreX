const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { search } = require('../controllers/searchController');

const router = express.Router();

router.use(requireAuth);
router.get('/', search);

module.exports = router;