const db = require('../config/db');

async function search(req, res, next) {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  if (query.length < 2) {
    return res.status(400).json({ message: 'Search query must contain at least 2 characters.' });
  }

  try {
    const pattern = `%${query}%`;
    const [folders, files] = await Promise.all([
      db.query(
        `SELECT id, owner_id, parent_folder_id, name, created_at, updated_at
         FROM folders
         WHERE owner_id = $1 AND deleted_at IS NULL AND name ILIKE $2
         ORDER BY lower(name)
         LIMIT 50`,
        [req.user.id, pattern]
      ),
      db.query(
        `SELECT id, owner_id, folder_id, name, mime_type, size_bytes, created_at, updated_at
         FROM files
         WHERE owner_id = $1 AND deleted_at IS NULL AND name ILIKE $2
         ORDER BY lower(name)
         LIMIT 50`,
        [req.user.id, pattern]
      ),
    ]);

    return res.status(200).json({ folders: folders.rows, files: files.rows });
  } catch (error) {
    return next(error);
  }
}

module.exports = { search };