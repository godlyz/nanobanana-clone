# Task 2.7: Implement Row Level Security (RLS) Policies

**Files**: SQL migration scripts
**Estimated Time**: 2 hours
**Dependencies**: Task 1.1-1.3 (Database schema)
**Priority**: P1 (Important)

## Overview

Secure database access with Supabase Row Level Security policies:
- Ensure users can only access their own video generation tasks
- Protect credit transactions from unauthorized access
- Allow admin access for management functions
- Enable API key-based access for external integrations
- Follow principle of least privilege

## Subtasks

### 2.7.1: Video Generation History RLS Policies

```sql
-- supabase/migrations/YYYYMMDD_video_generation_rls.sql

-- Enable RLS on video_generation_history table
ALTER TABLE video_generation_history ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own video generation tasks
CREATE POLICY "Users can view own video tasks"
ON video_generation_history
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Policy 2: Users can create their own video generation tasks
CREATE POLICY "Users can create own video tasks"
ON video_generation_history
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Policy 3: System can update video tasks (for cron jobs)
-- Uses service role key, bypasses RLS
-- No explicit policy needed - service role key has full access

-- Policy 4: Users cannot delete video tasks (audit trail)
-- DELETE is implicitly denied (no policy created)

-- Policy 5: Admin users can view all video tasks
CREATE POLICY "Admins can view all video tasks"
ON video_generation_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy 6: API key-based access for external integrations
CREATE POLICY "API keys can access owner's video tasks"
ON video_generation_history
FOR SELECT
USING (
  user_id IN (
    SELECT ak.user_id
    FROM api_keys ak
    WHERE ak.key = current_setting('request.headers.x-api-key', true)
    AND ak.is_active = true
  )
);
```

### 2.7.2: Credit Transactions RLS Policies

```sql
-- supabase/migrations/YYYYMMDD_credit_transactions_rls.sql

-- Enable RLS on credit_transactions table
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own credit transactions
CREATE POLICY "Users can view own credit transactions"
ON credit_transactions
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Policy 2: System can create credit transactions (for video generation)
-- Uses service role key or database functions
CREATE POLICY "System can create credit transactions"
ON credit_transactions
FOR INSERT
WITH CHECK (
  -- Only allow if called from authenticated context or service role
  auth.uid() = user_id OR auth.role() = 'service_role'
);

-- Policy 3: Admins can view all credit transactions
CREATE POLICY "Admins can view all credit transactions"
ON credit_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy 4: No user can update or delete credit transactions (immutable audit trail)
-- UPDATE and DELETE are implicitly denied
```

### 2.7.3: System Configs RLS Policies

```sql
-- supabase/migrations/YYYYMMDD_system_configs_rls.sql

-- Enable RLS on system_configs table
ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;

-- Policy 1: All authenticated users can read system configs
CREATE POLICY "Authenticated users can read system configs"
ON system_configs
FOR SELECT
USING (
  auth.role() = 'authenticated'
);

-- Policy 2: Only admins can update system configs
CREATE POLICY "Admins can update system configs"
ON system_configs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy 3: Only admins can insert new system configs
CREATE POLICY "Admins can insert system configs"
ON system_configs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
```

### 2.7.4: API Keys RLS Policies

```sql
-- supabase/migrations/YYYYMMDD_api_keys_rls.sql

-- Enable RLS on api_keys table
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own API keys
CREATE POLICY "Users can view own API keys"
ON api_keys
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Policy 2: Users can create their own API keys
CREATE POLICY "Users can create own API keys"
ON api_keys
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Policy 3: Users can update (deactivate) their own API keys
CREATE POLICY "Users can update own API keys"
ON api_keys
FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- Policy 4: Users can delete their own API keys
CREATE POLICY "Users can delete own API keys"
ON api_keys
FOR DELETE
USING (
  auth.uid() = user_id
);

-- Policy 5: Admins can view all API keys
CREATE POLICY "Admins can view all API keys"
ON api_keys
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
```

### 2.7.5: User Roles RLS Policies

```sql
-- supabase/migrations/YYYYMMDD_user_roles_rls.sql

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own roles
CREATE POLICY "Users can view own roles"
ON user_roles
FOR SELECT
USING (
  auth.uid() = user_id
);

-- Policy 2: Only admins can assign roles
CREATE POLICY "Admins can assign roles"
ON user_roles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Policy 3: Only admins can update roles
CREATE POLICY "Admins can update roles"
ON user_roles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Policy 4: Only admins can remove roles
CREATE POLICY "Admins can remove roles"
ON user_roles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);
```

### 2.7.6: Helper Functions for RLS

```sql
-- supabase/migrations/YYYYMMDD_rls_helper_functions.sql

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user ID from API key
CREATE OR REPLACE FUNCTION get_user_id_from_api_key(api_key TEXT)
RETURNS UUID AS $$
DECLARE
  found_user_id UUID;
BEGIN
  SELECT user_id INTO found_user_id
  FROM api_keys
  WHERE key = api_key
  AND is_active = true;

  RETURN found_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate API key (for use in policies)
CREATE OR REPLACE FUNCTION validate_api_key(api_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM api_keys
    WHERE key = api_key
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Verification Steps

```bash
# 1. Test video_generation_history RLS
# Login as user A
supabase auth login --email user-a@example.com

# Try to access user A's own tasks (should succeed)
curl http://localhost:3000/api/v1/video/status/user-a-task-id \
  -H "Authorization: Bearer user-a-jwt-token"

# Try to access user B's tasks (should fail with 403)
curl http://localhost:3000/api/v1/video/status/user-b-task-id \
  -H "Authorization: Bearer user-a-jwt-token"

# 2. Test credit_transactions RLS
# Query user's own transactions (should succeed)
psql $DATABASE_URL -c "
SET request.jwt.claim.sub = 'user-a-id';
SELECT * FROM credit_transactions WHERE user_id = 'user-a-id';
"

# Try to query another user's transactions (should return empty)
psql $DATABASE_URL -c "
SET request.jwt.claim.sub = 'user-a-id';
SELECT * FROM credit_transactions WHERE user_id = 'user-b-id';
"

# 3. Test admin access
# Create admin user
psql $DATABASE_URL -c "
INSERT INTO user_roles (user_id, role) VALUES ('admin-user-id', 'admin');
"

# Admin can view all video tasks
psql $DATABASE_URL -c "
SET request.jwt.claim.sub = 'admin-user-id';
SELECT * FROM video_generation_history;
"

# 4. Test API key access
# Create API key for user A
psql $DATABASE_URL -c "
INSERT INTO api_keys (user_id, key, name) VALUES ('user-a-id', 'test-api-key-123', 'Test Key');
"

# Access with API key (should succeed for user A's tasks)
curl http://localhost:3000/api/v1/video/status/user-a-task-id \
  -H "x-api-key: test-api-key-123"

# 5. Test system_configs RLS
# Authenticated user can read configs (should succeed)
psql $DATABASE_URL -c "
SET request.jwt.claim.sub = 'user-a-id';
SELECT * FROM system_configs;
"

# Non-admin user cannot update configs (should fail)
psql $DATABASE_URL -c "
SET request.jwt.claim.sub = 'user-a-id';
UPDATE system_configs SET value = '50' WHERE key = 'video_credits_4s_720p';
"

# Admin can update configs (should succeed)
psql $DATABASE_URL -c "
SET request.jwt.claim.sub = 'admin-user-id';
UPDATE system_configs SET value = '50' WHERE key = 'video_credits_4s_720p';
"

# 6. Test credit transaction immutability
# Try to update credit transaction (should fail)
psql $DATABASE_URL -c "
SET request.jwt.claim.sub = 'user-a-id';
UPDATE credit_transactions SET amount = 100 WHERE id = 'transaction-id';
"

# Try to delete credit transaction (should fail)
psql $DATABASE_URL -c "
SET request.jwt.claim.sub = 'user-a-id';
DELETE FROM credit_transactions WHERE id = 'transaction-id';
"

# 7. Verify service role bypass
# Service role can access all data (for cron jobs)
psql $DATABASE_URL -c "
-- Using SUPABASE_SERVICE_ROLE_KEY
SELECT * FROM video_generation_history WHERE status = 'processing';
"

# 8. Test helper functions
psql $DATABASE_URL -c "
SELECT is_admin('user-a-id'); -- Should return false
SELECT is_admin('admin-user-id'); -- Should return true
SELECT get_user_id_from_api_key('test-api-key-123'); -- Should return user-a-id
SELECT validate_api_key('test-api-key-123'); -- Should return true
SELECT validate_api_key('invalid-key'); -- Should return false
"
```

## Acceptance Criteria

- [ ] RLS enabled on all tables (video_generation_history, credit_transactions, system_configs, api_keys, user_roles)
- [ ] Users can only access their own video generation tasks
- [ ] Users can only view their own credit transactions
- [ ] Credit transactions are immutable (no UPDATE or DELETE allowed)
- [ ] Admins can view all data across tables
- [ ] API key-based access works correctly
- [ ] Service role key bypasses RLS (for cron jobs)
- [ ] System configs readable by all authenticated users
- [ ] System configs only modifiable by admins
- [ ] User roles only manageable by admins
- [ ] Helper functions (is_admin, get_user_id_from_api_key, validate_api_key) work correctly
- [ ] All policies tested and verified
- [ ] No unauthorized data access possible
- [ ] Audit trail preserved (no deletion of credit transactions)
