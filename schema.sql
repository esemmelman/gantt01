-- Reference schema, already installed in bnaimitzvah.
create table public.gantt01_20261016_tasks (
 id uuid primary key default gen_random_uuid(),
 parent_id uuid references public.gantt01_20261016_tasks(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 200),
 start_date date, end_date date,
 progress integer not null default 0 check(progress between 0 and 100),
 color text not null default '#6172f3', sort_order bigint not null default 0,
 notes text not null default '', created_at timestamptz not null default now(),
 check(end_date >= start_date),
 check ((start_date is null) = (end_date is null))
);
create index gantt01_20261016_parent_idx on public.gantt01_20261016_tasks(parent_id);
alter table public.gantt01_20261016_tasks enable row level security;
grant select, insert, update, delete on public.gantt01_20261016_tasks to anon, authenticated;
create policy gantt01_shared_access on public.gantt01_20261016_tasks for all to anon, authenticated using(true) with check(true);
create function public.gantt01_20261016_validate_depth() returns trigger language plpgsql set search_path=public as $$
declare ancestor uuid; n integer := 1; subtree_depth integer;
begin
 ancestor := new.parent_id;
 while ancestor is not null loop
  if ancestor = new.id then raise exception 'Tasks cannot contain cycles'; end if;
  n := n + 1;
  if n > 4 then raise exception 'Tasks support at most four levels'; end if;
  select parent_id into ancestor from public.gantt01_20261016_tasks where id=ancestor;
 end loop;
 with recursive descendants as (
  select id, 1 as depth from public.gantt01_20261016_tasks where parent_id=new.id
  union all select t.id, d.depth+1 from public.gantt01_20261016_tasks t join descendants d on t.parent_id=d.id
 ) select coalesce(max(depth),0) into subtree_depth from descendants;
 if n+subtree_depth > 4 then raise exception 'Moving this task would exceed four levels'; end if;
 return new;
end $$;
create trigger gantt01_depth before insert or update of parent_id on public.gantt01_20261016_tasks for each row execute function public.gantt01_20261016_validate_depth();

-- Completion overrides for imported DayFlow entries; native tasks use progress=100.
create table public.gantt01_20261017_completion (
 task_id text primary key, completed boolean not null default false
);
alter table public.gantt01_20261017_completion enable row level security;
grant select,insert,update,delete on public.gantt01_20261017_completion to anon,authenticated;
create policy gantt01_completion_shared on public.gantt01_20261017_completion
 for all to anon,authenticated using(true) with check(true);

-- Rich documents and checklists for first-level nodes.
create table public.gantt01_20261017_node_content (
 node_id uuid primary key references public.gantt01_20261016_tasks(id) on delete cascade,
 doc_html text not null default '',
 checklist jsonb not null default '[]'::jsonb check(jsonb_typeof(checklist)='array')
);
alter table public.gantt01_20261017_node_content enable row level security;
grant select,insert,update,delete on public.gantt01_20261017_node_content to anon,authenticated;
create policy gantt01_node_content_shared on public.gantt01_20261017_node_content
 for all to anon,authenticated using(true) with check(true);
