# StoreX Database Design

The initial StoreX database uses PostgreSQL. Object storage contains file bytes; PostgreSQL stores identity, metadata, access control, versions, and audit records.

## Core entities

- `users`: account identity, password hash, status, and lifecycle timestamps.
- `folders`: hierarchical folders owned by a user.
- `files`: file metadata and the object-storage key for the current file.
- `file_versions`: immutable historical versions of a file.
- `permissions`: a user's role on one folder or file (`viewer`, `editor`, or `owner`).
- `audit_logs`: security and file-operation history with optional JSON metadata.

## Integrity rules

- Email addresses are stored lowercase and are unique among non-deleted users.
- Folder and file names are unique within their owner's parent folder, case-insensitively.
- A permission targets exactly one resource type.
- File version numbers are unique per file and must be positive.
- File and version sizes cannot be negative.
- Deleting a file cascades to its versions and permissions; audit records remain.

## Storage flow

1. The API creates a `files` row and reserves a unique `storage_key`.
2. The object is uploaded to the configured object-storage provider.
3. The API records the first row in `file_versions` and updates file metadata.
4. Downloads resolve the current `storage_key` only after the caller's permission is checked.

## Migration

Apply [database/schema.sql](../database/schema.sql) to a PostgreSQL 15+ database. Application migrations should later split this initial schema into versioned migrations without changing the data model casually.