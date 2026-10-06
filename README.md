# StoreX

## Implementation Progress

- Step 5: Database design implemented for PostgreSQL.


The initial schema is in [database/schema.sql](database/schema.sql), with design decisions documented in [docs/database-design.md](docs/database-design.md).

The database stores users, folders, file metadata, immutable file versions, permissions, and audit logs. File bytes remain in object storage and are referenced by `storage_key`.

- Step 6: User authentication and authorization implemented for the backend.

Completed Step 6: User Authentication & Authorization.

### Included in this step
- User registration via `POST /api/auth/register`
- Secure password hashing using bcrypt
- User login via `POST /api/auth/login`
- JWT generation and verification
- Authentication middleware for protected routes
- Role-based authorization with `USER` and `ADMIN`
- Protected user route: `GET /api/auth/me`
- Admin-only test route: `GET /api/admin/test`
- Input validation and safe error handling
- Environment-based configuration using `.env`
- Backend project setup in `backend/`

### Database update
- Added a `role` column to the existing `users` table to support role-based access control without redesigning the full schema.

### Notes
- This step focuses only on authentication and authorization.
- File upload, file download, S3 storage, and later project features are intentionally not implemented yet.
- The project is now ready for further backend testing and Postman validation of the auth flow.


