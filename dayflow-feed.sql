-- Applied to the DayFlow project (ynfjfanvdvpyycoeweca), not bnaimitzvah.
-- Public, read-only projection of the owner's dated DayFlow entries.
create table public.gantt01_dayflow_dated_20261017 (
 id text primary key, title text not null, date date not null,
 start_time time, color text not null
);
alter table public.gantt01_dayflow_dated_20261017 enable row level security;
grant select on public.gantt01_dayflow_dated_20261017 to anon,authenticated;
revoke insert,update,delete on public.gantt01_dayflow_dated_20261017 from anon,authenticated;
create policy gantt01_dayflow_read on public.gantt01_dayflow_dated_20261017
 for select to anon,authenticated using(true);
create schema if not exists gantt01_internal;
create function gantt01_internal.sync_dayflow_dated_20261017()
 returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP <> 'INSERT' then
  if old.user_id='96ad83cc-352b-4bd1-aa01-a0cd9dadfad2'::uuid then
   delete from public.gantt01_dayflow_dated_20261017 where id=old.id;
  end if;
 end if;
 if TG_OP <> 'DELETE' then
  if new.user_id='96ad83cc-352b-4bd1-aa01-a0cd9dadfad2'::uuid and new.date is not null then
   insert into public.gantt01_dayflow_dated_20261017(id,title,date,start_time,color)
   values(new.id,new.title,new.date,new.start_time,new.color)
   on conflict(id) do update set title=excluded.title,date=excluded.date,
    start_time=excluded.start_time,color=excluded.color;
  end if;
 end if;
 return null;
end $$;
revoke all on function gantt01_internal.sync_dayflow_dated_20261017() from public,anon,authenticated;
create trigger gantt01_dayflow_sync after insert or update or delete on public.tasks
 for each row execute function gantt01_internal.sync_dayflow_dated_20261017();
insert into public.gantt01_dayflow_dated_20261017(id,title,date,start_time,color)
 select id,title,date,start_time,color from public.tasks
 where user_id='96ad83cc-352b-4bd1-aa01-a0cd9dadfad2' and date is not null;
