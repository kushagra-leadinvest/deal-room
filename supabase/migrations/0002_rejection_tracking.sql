-- Rejection tracking: remember where in the pipeline a deal was passed on / lost, and when.
-- Run once in the Supabase SQL editor after 0001_schema.sql.

alter table deals
  add column rejected_at_stage pipeline_stage,
  add column closed_at timestamptz;

-- When a deal moves to passed or lost, record the stage it was in and the time.
-- The values stay on the deal if it is later reactivated, and are overwritten if it is passed again.
create or replace function record_rejection() returns trigger
language plpgsql as $$
begin
  if new.end_state in ('passed', 'lost')
     and (tg_op = 'INSERT' or old.end_state not in ('passed', 'lost')) then
    new.rejected_at_stage := case when tg_op = 'INSERT' then new.pipeline_stage else old.pipeline_stage end;
    new.closed_at := now();
  end if;
  return new;
end $$;

create trigger deals_record_rejection
  before insert or update of end_state on deals
  for each row execute function record_rejection();

-- Backfill deals that were already passed or lost.
update deals
set rejected_at_stage = pipeline_stage,
    closed_at = updated_at
where end_state in ('passed', 'lost') and rejected_at_stage is null;
