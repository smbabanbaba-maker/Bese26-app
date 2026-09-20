-- Stable admin KYC queue. Returning one JSON payload avoids client-side relation/query failures.
create or replace function public.admin_verification_queue()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.current_user_can_moderate() then raise exception 'MODERATOR_REQUIRED'; end if;
  select coalesce(jsonb_agg(row_data order by created_at asc), '[]'::jsonb)
  into v_result
  from (
    select v.created_at,
      to_jsonb(v) || jsonb_build_object(
        'profile', jsonb_build_object(
          'display_name', p.display_name,
          'username', p.username
        )
      ) as row_data
    from public.verification_applications v
    left join public.profiles p on p.id = v.user_id
    where v.status in ('pending', 'pending_review', 'under_review', 'requires_more_information', 'action_required')
    order by v.created_at asc
    limit 200
  ) queued;
  return v_result;
end;
$$;

revoke all on function public.admin_verification_queue() from public, anon;
grant execute on function public.admin_verification_queue() to authenticated;
