const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const {
  listFiles,
  listRecentFiles,
  uploadFile,
  downloadFile,
  renameFile,
  deleteFile,
} = require('../controllers/fileController');

const router = express.Router();
const receiveFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
}).single('file');

router.use(requireAuth);
router.get('/recent', listRecentFiles);
router.get('/', listFiles);
router.post('/', (req, res, next) => {
  receiveFile(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Files must be 25 MB or smaller.' });
    }

    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }

    return next(error);
  });
}, uploadFile);
router.patch('/:id', renameFile);
router.delete('/:id', deleteFile);
router.get('/:id/download', downloadFile);

module.exports = router;