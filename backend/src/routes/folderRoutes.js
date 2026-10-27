const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  listFolders,
  getFolder,
  createFolder,
  renameFolder,
  deleteFolder,
} = require('../controllers/folderController');

const router = express.Router();

router.use(requireAuth);
router.get('/', listFolders);
router.post('/', createFolder);
router.get('/:id', getFolder);
router.patch('/:id', renameFolder);
router.delete('/:id', deleteFolder);

module.exports = router;