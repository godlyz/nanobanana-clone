UPDATE auth.users 
SET encrypted_password = crypt('Admin123456!', gen_salt('bf'))
WHERE email = 'kn197884@gmail.com';

SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'kn197884@gmail.com';
