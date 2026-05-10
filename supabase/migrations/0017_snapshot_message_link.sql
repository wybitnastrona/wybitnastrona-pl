-- Link each project_snapshot to the assistant chat message it preceded so
-- the UI can render a "Cofnij do tego momentu" button next to each AI reply.

alter table public.project_snapshots
  add column if not exists message_id text;

create index if not exists project_snapshots_message_id_idx
  on public.project_snapshots (project_id, message_id);
