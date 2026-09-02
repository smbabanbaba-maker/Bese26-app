-- Assign the first Bese26 owner/admin by the verified auth email.
-- This is intentionally idempotent and does not expose credentials.
update public.profiles as p
set app_role = 'admin'
from auth.users as u
where p.id = u.id
  and lower(u.email) = 'smbabanbaba@gmail.com';
