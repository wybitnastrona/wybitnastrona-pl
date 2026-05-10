-- RAG: knowledge base z pgvector (embeddings)
--
-- Wymaga: extension pgvector w Supabase (Database -> Extensions -> vector).

create extension if not exists vector;

create table if not exists public.knowledge_docs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  title       text not null,
  content     text not null,
  embedding   vector(1536),
  source      text,
  created_at  timestamptz not null default now()
);

create index if not exists kb_user_idx on public.knowledge_docs(user_id);
create index if not exists kb_project_idx on public.knowledge_docs(project_id);
create index if not exists kb_embedding_idx on public.knowledge_docs
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.knowledge_docs enable row level security;

drop policy if exists "owner_full" on public.knowledge_docs;
create policy "owner_full" on public.knowledge_docs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Funkcja do similarity search (cosine).
create or replace function public.match_knowledge(
  p_user_id uuid,
  p_project_id uuid,
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 3
)
returns table (
  id uuid,
  title text,
  content text,
  similarity float
) language sql stable security definer as $$
  select
    id, title, content,
    1 - (embedding <=> query_embedding) as similarity
  from public.knowledge_docs
  where user_id = p_user_id
    and (p_project_id is null or project_id = p_project_id or project_id is null)
    and embedding is not null
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
