const db = require('../config/db');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function handleFolderError(error, res, next) {
  if (error.code === '23505') {
    return res.status(409).json({ message: 'A folder with that name already exists here.' });
  }

  return next(error);
}

async function listFolders(req, res, next) {
  try {
    const parentFolderId = req.query.parentFolderId ?? null;

    if (parentFolderId !== null && !isUuid(parentFolderId)) {
      return res.status(400).json({ message: 'parentFolderId must be a valid UUID.' });
    }

    const result = await db.query(
      `SELECT id, owner_id, parent_folder_id, name, created_at, updated_at
       FROM folders
       WHERE owner_id = $1 AND parent_folder_id IS NOT DISTINCT FROM $2::uuid AND deleted_at IS NULL
       ORDER BY lower(name), id`,
      [req.user.id, parentFolderId]
    );

    return res.status(200).json({ folders: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function getFolder(req, res, next) {
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      return res.status(400).json({ message: 'Folder id must be a valid UUID.' });
    }

    const result = await db.query(
      `SELECT id, owner_id, parent_folder_id, name, created_at, updated_at
       FROM folders
       WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    return res.status(200).json({ folder: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function createFolder(req, res, next) {
  const { name, parentFolderId = null } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (!trimmedName) {
    return res.status(400).json({ message: 'Folder name is required.' });
  }

  if (parentFolderId !== null && !isUuid(parentFolderId)) {
    return res.status(400).json({ message: 'parentFolderId must be a valid UUID.' });
  }

  try {
    if (parentFolderId !== null) {
      const parent = await db.query(
        `SELECT id FROM folders
         WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
        [parentFolderId, req.user.id]
      );

      if (parent.rows.length === 0) {
        return res.status(404).json({ message: 'Parent folder not found.' });
      }
    }

    const result = await db.query(
      `INSERT INTO folders (owner_id, parent_folder_id, name)
       VALUES ($1, $2, $3)
       RETURNING id, owner_id, parent_folder_id, name, created_at, updated_at`,
      [req.user.id, parentFolderId, trimmedName]
    );

    return res.status(201).json({ folder: result.rows[0] });
  } catch (error) {
    return handleFolderError(error, res, next);
  }
}

async function renameFolder(req, res, next) {
  const { id } = req.params;
  const { name } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (!isUuid(id)) {
    return res.status(400).json({ message: 'Folder id must be a valid UUID.' });
  }

  if (!trimmedName) {
    return res.status(400).json({ message: 'Folder name is required.' });
  }

  try {
    const result = await db.query(
      `UPDATE folders
       SET name = $1
       WHERE id = $2 AND owner_id = $3 AND deleted_at IS NULL
       RETURNING id, owner_id, parent_folder_id, name, created_at, updated_at`,
      [trimmedName, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    return res.status(200).json({ folder: result.rows[0] });
  } catch (error) {
    return handleFolderError(error, res, next);
  }
}

async function deleteFolder(req, res, next) {
  const { id } = req.params;

  if (!isUuid(id)) {
    return res.status(400).json({ message: 'Folder id must be a valid UUID.' });
  }

  try {
    const folder = await db.query(
      `SELECT id FROM folders
       WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
      [id, req.user.id]
    );

    if (folder.rows.length === 0) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    const contents = await db.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM folders
           WHERE parent_folder_id = $1 AND owner_id = $2 AND deleted_at IS NULL
         ) AS has_folders,
         EXISTS (
           SELECT 1 FROM files
           WHERE folder_id = $1 AND owner_id = $2 AND deleted_at IS NULL
         ) AS has_files`,
      [id, req.user.id]
    );

    if (contents.rows[0].has_folders || contents.rows[0].has_files) {
      return res.status(409).json({ message: 'Folder must be empty before it can be deleted.' });
    }

    await db.query(
      'UPDATE folders SET deleted_at = now() WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listFolders,
  getFolder,
  createFolder,
  renameFolder,
  deleteFolder,
};