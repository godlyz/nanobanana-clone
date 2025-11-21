ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

UPDATE admin_users 
SET user_id = auth.users.id
FROM auth.users
WHERE admin_users.email = auth.users.email
AND admin_users.user_id IS NULL;

UPDATE admin_users 
SET role = 'super_admin', 
    status = 'active', 
    updated_at = NOW()
WHERE email = 'kn197884@gmail.com';

ALTER TABLE admin_users 
DROP CONSTRAINT IF EXISTS admin_users_user_id_unique;

ALTER TABLE admin_users 
ADD CONSTRAINT admin_users_user_id_unique UNIQUE (user_id);

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

SELECT 
  id,
  email,
  name,
  role,
  status,
  user_id,
  auth_provider,
  email_verified,
  created_at
FROM admin_users
WHERE email = 'kn197884@gmail.com';
