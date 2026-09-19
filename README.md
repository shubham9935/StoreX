# StoreX

## Implementation Progress

- Step 5: Database design implemented for PostgreSQL.

The initial schema is in [database/schema.sql](database/schema.sql), with design decisions documented in [docs/database-design.md](docs/database-design.md).

The database stores users, folders, file metadata, immutable file versions, permissions, and audit logs. File bytes remain in object storage and are referenced by `storage_key`.


