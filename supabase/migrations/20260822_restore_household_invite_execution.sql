-- Restore the RPC permission required for signed-in invitees to join a household.
-- This is intentionally repeatable in case the original invite migration was
-- applied before function privileges were finalized in the hosted database.
revoke all on function public.accept_household_invite(uuid) from public, anon;
grant execute on function public.accept_household_invite(uuid) to authenticated;
