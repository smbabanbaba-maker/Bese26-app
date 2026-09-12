-- Expose only the contact methods that the seller enabled for this published listing.
-- The RPC avoids exposing private profile contact rows through a public table select.
create or replace function public.get_listing_contact(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'phone', case
      when l.contact_preference in ('call', 'chat_call') then
        case when l.published_as_type = 'business' or l.business_profile_id is not null then nullif(bp.phone, '') else case when coalesce(pc.allow_calls, false) then nullif(pc.phone, '') end end
      else null
    end,
    'whatsapp', case
      when l.contact_preference in ('whatsapp', 'chat_whatsapp', 'chat_call') then
        case when l.published_as_type = 'business' or l.business_profile_id is not null then nullif(bp.whatsapp, '') else case when coalesce(pc.allow_whatsapp, false) then nullif(coalesce(pc.whatsapp, pc.phone), '') end end
      else null
    end
  )
  into v_result
  from public.listings l
  left join public.profile_contacts pc on pc.profile_id = l.seller_id
  left join public.business_profiles bp on bp.profile_id = l.business_profile_id and bp.is_active = true
  where l.id = p_listing_id
    and ((l.status = 'active' and l.moderation_status = 'approved') or l.seller_id = auth.uid());

  return coalesce(v_result, jsonb_build_object('phone', null, 'whatsapp', null));
end;
$$;

revoke all on function public.get_listing_contact(uuid) from public;
grant execute on function public.get_listing_contact(uuid) to anon, authenticated;
