-- StoreX database schema
-- PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE resource_type AS ENUM ('folder', 'file');
CREATE TYPE permission_role AS ENUM ('viewer', 'editor', 'owner');
CREATE TYPE audit_action AS ENUM (
    'user_registered',
    'folder_created',
    'file_uploaded',
    'file_downloaded',
    'file_updated',
    'file_deleted',
    'file_restored',
    'resource_shared',
    'resource_unshared',
    'login_succeeded',
    'login_failed'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    status user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
    CONSTRAINT users_display_name_not_blank CHECK (length(trim(display_name)) > 0)
);

CREATE UNIQUE INDEX users_email_unique ON users (email) WHERE deleted_at IS NULL;

CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users (id),
    parent_folder_id UUID REFERENCES folders (id),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT folders_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT folders_not_its_own_parent CHECK (id <> parent_folder_id)
);

CREATE UNIQUE INDEX folders_name_per_parent
    ON folders (owner_id, coalesce(parent_folder_id, '00000000-0000-0000-0000-000000000000'::UUID), lower(name))
    WHERE deleted_at IS NULL;

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users (id),
    folder_id UUID REFERENCES folders (id),
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    storage_key TEXT NOT NULL,
    checksum_sha256 CHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT files_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT files_size_not_negative CHECK (size_bytes >= 0)
);

CREATE UNIQUE INDEX files_name_per_folder
    ON files (owner_id, coalesce(folder_id, '00000000-0000-0000-0000-000000000000'::UUID), lower(name))
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX files_storage_key_unique ON files (storage_key);

CREATE TABLE file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files (id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_key TEXT NOT NULL,
    checksum_sha256 CHAR(64),
    created_by UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT file_versions_number_positive CHECK (version_number > 0),
    CONSTRAINT file_versions_size_not_negative CHECK (size_bytes >= 0),
    CONSTRAINT file_versions_unique_number UNIQUE (file_id, version_number),
    CONSTRAINT file_versions_storage_key_unique UNIQUE (storage_key)
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type resource_type NOT NULL,
    folder_id UUID REFERENCES folders (id) ON DELETE CASCADE,
    file_id UUID REFERENCES files (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role permission_role NOT NULL,
    granted_by UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT permissions_one_resource CHECK (
        (resource_type = 'folder' AND folder_id IS NOT NULL AND file_id IS NULL)
        OR (resource_type = 'file' AND file_id IS NOT NULL AND folder_id IS NULL)
    ),
    CONSTRAINT permissions_unique_folder_user UNIQUE (folder_id, user_id),
    CONSTRAINT permissions_unique_file_user UNIQUE (file_id, user_id)
);

CREATE TABLE audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id UUID REFERENCES users (id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    resource_type resource_type,
    resource_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX folders_owner_parent_idx ON folders (owner_id, parent_folder_id);
CREATE INDEX files_owner_folder_idx ON files (owner_id, folder_id);
CREATE INDEX file_versions_file_created_idx ON file_versions (file_id, created_at DESC);
CREATE INDEX permissions_user_idx ON permissions (user_id);
CREATE INDEX audit_logs_resource_idx ON audit_logs (resource_type, resource_id, created_at DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER folders_set_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER files_set_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();