-- Trigger functions run automatically; nobody needs to call them over the API.
-- Fixes Supabase advisor lints 0028/0029 (SECURITY DEFINER function executable by anon/authenticated).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
