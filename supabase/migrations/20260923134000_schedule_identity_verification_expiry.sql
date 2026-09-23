-- Run identity verification entitlement sync periodically so expired badges
-- are removed even when no subscription update event occurs.
do $$
begin
  if to_regnamespace('cron') is not null then
    begin
      perform cron.unschedule(jobid)
        from cron.job
       where jobname = 'bese26-sync-identity-verification';
    exception when others then
      null;
    end;
    begin
      perform cron.schedule(
        'bese26-sync-identity-verification',
        '*/15 * * * *',
        'select public.sync_identity_verification_entitlements();'
      );
    exception when others then
      null;
    end;
  end if;
end;
$$;
