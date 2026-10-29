# StoreX

## Implementation Progress

- Step 5: Database design implemented for PostgreSQL.


The initial schema is in [database/schema.sql](database/schema.sql), with design decisions documented in [docs/database-design.md](docs/database-design.md).

The database stores users, folders, file metadata, immutable file versions, permissions, and audit logs. File bytes remain in object storage and are referenced by `storage_key`.

- Step 6: User authentication and authorization implemented for the backend.
- Step 7: Initial migrations, backend tests, and authenticated folder CRUD implemented.
- Step 8: S3-compatible file upload, listing, and download endpoints implemented.

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
- Authenticated folder routes: `GET/POST /api/folders` and `GET/PATCH/DELETE /api/folders/:id`
- Folder deletion is soft-delete and requires the folder to be empty.
- Authenticated file routes: `GET/POST /api/files`, `GET /api/files/recent`, `PATCH/DELETE /api/files/:id`, and `GET /api/files/:id/download`
- Authenticated name search: `GET /api/search?q=...`
- Uploads are limited to 25 MB and require an `S3_BUCKET` configuration.
- Input validation and safe error handling
- Environment-based configuration using `.env`
- Backend project setup in `backend/`

### Database update
- Added a `role` column to the existing `users` table to support role-based access control without redesigning the full schema.

### Notes
- This step focuses only on authentication and authorization.
- File upload, file download, S3 storage, and later project features are intentionally not implemented yet.
- Run backend tests with `cd backend && npm test`.
- Apply the initial database migration to an empty database with `cd backend && npm run db:migrate`.
- Configure PostgreSQL and S3-compatible storage in `backend/.env` before using folder or file operations.
- File versioning, sharing permissions, and audit logging remain future work.

## Run the connected frontend

The React frontend uses the authenticated backend APIs for registration, sign-in, folders, file listing, search, upload, download, rename, and delete. Each request sends the signed-in user's JWT; the backend scopes folder and file queries to that account.

1. Configure PostgreSQL and S3-compatible object storage. Copy `backend/.env.example` to `backend/.env`, then set `DATABASE_URL`, a private `JWT_SECRET`, and the S3 credentials/bucket. Keep `.env` private.
2. Apply the database migrations:

   ```sh
   npm --prefix backend run db:migrate
   ```

3. Start the backend in one terminal:

   ```sh
   npm --prefix backend run dev
   ```

4. Start the frontend in another terminal:

   ```sh
   npm --prefix frontend run dev
   ```

5. Open the Vite URL shown in the terminal and create an account or sign in.

Vite proxies `/api` to `http://localhost:5000` by default. To use a different backend during development, set `VITE_API_PROXY_TARGET` in `frontend/.env`. For a deployed frontend, configure its hosting server to proxy `/api` to the backend.

File uploads require a working S3-compatible bucket and are limited to 25 MB. Shared drives, starred files, and trash are not yet implemented and are intentionally not shown as working features.
