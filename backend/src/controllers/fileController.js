const { randomUUID } = require('crypto');
const { pipeline } = require('stream/promises');
const db = require('../config/db');
const objectStorage = require('../services/objectStorage');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

async function listFiles(req, res, next) {
  const folderId = req.query.folderId ?? null;

  if (folderId !== null && !isUuid(folderId)) {
    return res.status(400).json({ message: 'folderId must be a valid UUID.' });
  }

  try {
    const result = await db.query(
      `SELECT id, owner_id, folder_id, name, mime_type, size_bytes, checksum_sha256, created_at, updated_at
       FROM files
       WHERE owner_id = $1 AND folder_id IS NOT DISTINCT FROM $2::uuid AND deleted_at IS NULL
       ORDER BY lower(name), id`,
      [req.user.id, folderId]
    );

    return res.status(200).json({ files: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function listRecentFiles(req, res, next) {
  try {
    const result = await db.query(
      `SELECT files.id, files.owner_id, files.folder_id, folders.name AS folder_name,
              files.name, files.mime_type, files.size_bytes, files.created_at, files.updated_at
       FROM files
       LEFT JOIN folders ON folders.id = files.folder_id AND folders.deleted_at IS NULL
       WHERE files.owner_id = $1 AND files.deleted_at IS NULL
       ORDER BY files.updated_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    return res.status(200).json({ files: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function uploadFile(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ message: 'A file is required in the "file" field.' });
  }

  const name = req.file.originalname.trim();
  const folderId = req.body.folderId || null;

  if (!name) {
    return res.status(400).json({ message: 'File name cannot be empty.' });
  }

  if (folderId !== null && !isUuid(folderId)) {
    return res.status(400).json({ message: 'folderId must be a valid UUID.' });
  }

  let storageKey;

  try {
    if (folderId !== null) {
      const folder = await db.query(
        `SELECT id FROM folders
         WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
        [folderId, req.user.id]
      );

      if (folder.rows.length === 0) {
        return res.status(404).json({ message: 'Folder not found.' });
      }
    }

    storageKey = `users/${req.user.id}/${randomUUID()}`;
    await objectStorage.putObject({
      key: storageKey,
      body: req.file.buffer,
      contentType: req.file.mimetype || 'application/octet-stream',
    });

    const result = await db.query(
      `INSERT INTO files (owner_id, folder_id, name, mime_type, size_bytes, storage_key)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, owner_id, folder_id, name, mime_type, size_bytes, created_at, updated_at`,
      [req.user.id, folderId, name, req.file.mimetype || 'application/octet-stream', req.file.size, storageKey]
    );

    return res.status(201).json({ file: result.rows[0] });
  } catch (error) {
    if (storageKey) {
      try {
        await objectStorage.deleteObject(storageKey);
      } catch (cleanupError) {
        console.error('Unable to remove unreferenced object from storage:', cleanupError);
      }
    }

    if (error.code === '23505') {
      return res.status(409).json({ message: 'A file with that name already exists here.' });
    }

    return next(error);
  }
}

async function downloadFile(req, res, next) {
  const { id } = req.params;

  if (!isUuid(id)) {
    return res.status(400).json({ message: 'File id must be a valid UUID.' });
  }

  try {
    const result = await db.query(
      `SELECT name, mime_type, storage_key
       FROM files
       WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL`,
      [id, req.user.id]
    );

    const file = result.rows[0];

    if (!file) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const object = await objectStorage.getObject(file.storage_key);
    res.type(file.mime_type);
    res.attachment(file.name);
    await pipeline(object.Body, res);
  } catch (error) {
    return next(error);
  }
}

async function renameFile(req, res, next) {
  const { id } = req.params;
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

  if (!isUuid(id)) {
    return res.status(400).json({ message: 'File id must be a valid UUID.' });
  }

  if (!name) {
    return res.status(400).json({ message: 'File name is required.' });
  }

  try {
    const result = await db.query(
      `UPDATE files
       SET name = $1
       WHERE id = $2 AND owner_id = $3 AND deleted_at IS NULL
       RETURNING id, owner_id, folder_id, name, mime_type, size_bytes, created_at, updated_at`,
      [name, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found.' });
    }

    return res.status(200).json({ file: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'A file with that name already exists here.' });
    }

    return next(error);
  }
}

async function deleteFile(req, res, next) {
  const { id } = req.params;

  if (!isUuid(id)) {
    return res.status(400).json({ message: 'File id must be a valid UUID.' });
  }

  try {
    const result = await db.query(
      `UPDATE files
       SET deleted_at = now()
       WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found.' });
    }

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

module.exports = { listFiles, listRecentFiles, uploadFile, downloadFile, renameFile, deleteFile };