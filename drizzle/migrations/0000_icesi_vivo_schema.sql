
create type public.app_role as enum ('admin','moderator','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Guardián',
  username text unique,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), '[^a-zA-Z0-9_]', '', 'g'));
  if base = '' then base := 'guardian'; end if;
  if exists (select 1 from public.profiles where username = base) then
    base := base || substr(md5(new.id::text),1,4);
  end if;
  insert into public.profiles (id, display_name, username)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)), base);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Photos
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  species text not null check (species in ('iguana','ardilla','pato','guatin')),
  title text not null,
  description text,
  image_url text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  featured boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.photos to authenticated;
grant all on public.photos to service_role;
alter table public.photos enable row level security;
create policy "photos visible" on public.photos for select to authenticated using (status = 'approved' or user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "photos insert own" on public.photos for insert to authenticated with check (user_id = auth.uid());
create policy "photos admin update" on public.photos for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "photos delete" on public.photos for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.photos_force_pending()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then new.status := 'pending'; new.featured := false; end if;
  return new;
end $$;
create trigger photos_pending before insert on public.photos for each row execute function public.photos_force_pending();

create table public.photo_likes (
  photo_id uuid not null references public.photos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (photo_id, user_id)
);
grant select, insert, delete on public.photo_likes to authenticated;
grant all on public.photo_likes to service_role;
alter table public.photo_likes enable row level security;
create policy "likes read" on public.photo_likes for select to authenticated using (true);
create policy "likes own ins" on public.photo_likes for insert to authenticated with check (user_id = auth.uid());
create policy "likes own del" on public.photo_likes for delete to authenticated using (user_id = auth.uid());

create table public.photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.photo_comments to authenticated;
grant all on public.photo_comments to service_role;
alter table public.photo_comments enable row level security;
create policy "pc read" on public.photo_comments for select to authenticated using (true);
create policy "pc ins" on public.photo_comments for insert to authenticated with check (user_id = auth.uid());
create policy "pc del" on public.photo_comments for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- Forum
create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('sabias','preguntas','historias','cuidar','comunidad')),
  title text not null check (length(title) between 3 and 160),
  body text not null check (length(body) between 1 and 5000),
  image_url text,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.forum_posts to authenticated;
grant all on public.forum_posts to service_role;
alter table public.forum_posts enable row level security;
create policy "fp read" on public.forum_posts for select to authenticated using (not hidden or user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "fp ins" on public.forum_posts for insert to authenticated with check (user_id = auth.uid());
create policy "fp upd" on public.forum_posts for update to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "fp del" on public.forum_posts for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  parent_id uuid references public.forum_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.forum_comments to authenticated;
grant all on public.forum_comments to service_role;
alter table public.forum_comments enable row level security;
create policy "fc read" on public.forum_comments for select to authenticated using (true);
create policy "fc ins" on public.forum_comments for insert to authenticated with check (user_id = auth.uid());
create policy "fc del" on public.forum_comments for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.forum_likes (
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);
grant select, insert, delete on public.forum_likes to authenticated;
grant all on public.forum_likes to service_role;
alter table public.forum_likes enable row level security;
create policy "fl read" on public.forum_likes for select to authenticated using (true);
create policy "fl ins" on public.forum_likes for insert to authenticated with check (user_id = auth.uid());
create policy "fl del" on public.forum_likes for delete to authenticated using (user_id = auth.uid());

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','photo')),
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "rep ins" on public.reports for insert to authenticated with check (user_id = auth.uid());
create policy "rep admin read" on public.reports for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "rep admin upd" on public.reports for update to authenticated using (public.has_role(auth.uid(),'admin'));

-- Games
create table public.questions (
  id text primary key,
  challenge_key text not null,
  position int not null,
  prompt text not null,
  options text[] not null,
  species text,
  explanation text
);
grant select on public.questions to authenticated;
grant all on public.questions to service_role;
alter table public.questions enable row level security;
create policy "q read" on public.questions for select to authenticated using (true);

create table public.question_answers (
  question_id text primary key references public.questions(id) on delete cascade,
  correct_index int not null
);
grant all on public.question_answers to service_role;
alter table public.question_answers enable row level security;

create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  prize_species text not null,
  status text not null default 'active' check (status in ('active','closed')),
  created_at timestamptz not null default now()
);
grant select on public.cycles to authenticated;
grant all on public.cycles to service_role;
alter table public.cycles enable row level security;
create policy "cy read" on public.cycles for select to authenticated using (true);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null references public.questions(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  week_start date not null,
  choice int not null,
  is_correct boolean not null,
  points int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, question_id, week_start)
);
grant select on public.answers to authenticated;
grant all on public.answers to service_role;
alter table public.answers enable row level security;
create policy "ans own" on public.answers for select to authenticated using (user_id = auth.uid());

create table public.memory_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  week_start date not null,
  moves int not null,
  points int not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);
grant select on public.memory_results to authenticated;
grant all on public.memory_results to service_role;
alter table public.memory_results enable row level security;
create policy "mem own" on public.memory_results for select to authenticated using (user_id = auth.uid());

create table public.winners (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null unique references public.cycles(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  accuracy numeric not null,
  completed int not null,
  correct int not null,
  prize_species text not null,
  reward_status text not null default 'pending_validation' check (reward_status in ('pending_validation','confirmed','delivered')),
  created_at timestamptz not null default now()
);
grant select, update on public.winners to authenticated;
grant all on public.winners to service_role;
alter table public.winners enable row level security;
create policy "w read" on public.winners for select to authenticated using (true);
create policy "w admin upd" on public.winners for update to authenticated using (public.has_role(auth.uid(),'admin'));

-- helpers
create or replace function public.bogota_week_start() returns date language sql stable as $$
  select date_trunc('week', (now() at time zone 'America/Bogota'))::date
$$;

create or replace function public.leaderboard(_cycle uuid)
returns table(user_id uuid, display_name text, username text, avatar_url text, total int, correct int, accuracy numeric, completed int, points int, eligible boolean, rank int)
language sql stable security definer set search_path = public as $$
  with a as (
    select an.user_id, count(*)::int total, count(*) filter (where an.is_correct)::int correct, sum(an.points)::int pts
    from answers an where an.cycle_id = _cycle group by an.user_id
  ),
  qc as (select challenge_key, count(*) n from questions group by challenge_key),
  done as (
    select an.user_id, an.week_start, q.challenge_key
    from answers an join questions q on q.id = an.question_id
    where an.cycle_id = _cycle
    group by an.user_id, an.week_start, q.challenge_key
    having count(*) >= (select n from qc where qc.challenge_key = q.challenge_key)
  ),
  dc as (select d.user_id, count(*)::int c from done d group by d.user_id),
  m as (select mr.user_id, count(*)::int c, sum(mr.points)::int pts from memory_results mr where mr.cycle_id = _cycle group by mr.user_id),
  sp as (
    select an.user_id, count(distinct q.species) n from answers an join questions q on q.id = an.question_id
    where an.cycle_id = _cycle and an.is_correct and q.species is not null group by an.user_id
  ),
  agg as (
    select p.id user_id, p.display_name, p.username, p.avatar_url,
      coalesce(a.total,0) total, coalesce(a.correct,0) correct,
      case when coalesce(a.total,0) = 0 then 0 else round(a.correct::numeric * 100 / a.total, 1) end accuracy,
      coalesce(dc.c,0) + coalesce(m.c,0) completed,
      coalesce(a.pts,0) + coalesce(m.pts,0) + case when coalesce(sp.n,0) >= 4 then 50 else 0 end points
    from profiles p
    left join a on a.user_id = p.id left join dc on dc.user_id = p.id
    left join m on m.user_id = p.id left join sp on sp.user_id = p.id
    where a.user_id is not null or m.user_id is not null
  )
  select agg.*, (agg.total >= 15 and agg.completed >= 3) eligible,
    (row_number() over (order by agg.accuracy desc, agg.completed desc, agg.correct desc, agg.points desc))::int rank
  from agg
$$;
grant execute on function public.leaderboard(uuid) to authenticated;

create or replace function public.ensure_cycle()
returns public.cycles language plpgsql security definer set search_path = public as $$
declare c public.cycles; w record; species_order text[] := array['iguana','ardilla','pato','guatin']; nxt text; idx int;
begin
  loop
    select * into c from cycles where status = 'active' order by starts_at desc limit 1;
    if c.id is null then
      insert into cycles (starts_at, ends_at, prize_species)
      values ((date_trunc('week', now() at time zone 'America/Bogota')) at time zone 'America/Bogota',
              (date_trunc('week', now() at time zone 'America/Bogota') + interval '14 days') at time zone 'America/Bogota', 'iguana')
      returning * into c;
      return c;
    end if;
    if c.ends_at > now() then return c; end if;
    -- close
    select * into w from public.leaderboard(c.id) l where l.eligible order by l.rank limit 1;
    insert into winners (cycle_id, user_id, accuracy, completed, correct, prize_species)
    values (c.id, w.user_id, coalesce(w.accuracy,0), coalesce(w.completed,0), coalesce(w.correct,0), c.prize_species)
    on conflict (cycle_id) do nothing;
    if w.user_id is not null then
      insert into forum_posts (user_id, category, title, body)
      values (w.user_id, 'comunidad', '🏆 ¡Tenemos guardián de la quincena!',
        '¡Felicitaciones! ' || w.display_name || ' es el guardián de la biodiversidad de esta quincena con ' || w.accuracy || '% de respuestas correctas y ' || w.completed || ' retos completados.');
    end if;
    update cycles set status = 'closed' where id = c.id;
    idx := array_position(species_order, c.prize_species);
    nxt := species_order[(coalesce(idx,0) % 4) + 1];
    insert into cycles (starts_at, ends_at, prize_species) values (c.ends_at, c.ends_at + interval '14 days', nxt);
  end loop;
end $$;
grant execute on function public.ensure_cycle() to authenticated;

create or replace function public.submit_answer(_question_id text, _choice int)
returns json language plpgsql security definer set search_path = public as $$
declare c public.cycles; ws date := public.bogota_week_start(); ci int; ok boolean; ex record; expl text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  c := public.ensure_cycle();
  select correct_index into ci from question_answers where question_id = _question_id;
  if ci is null then raise exception 'unknown question'; end if;
  select explanation into expl from questions where id = _question_id;
  select * into ex from answers where user_id = auth.uid() and question_id = _question_id and week_start = ws;
  if found then
    return json_build_object('correct', ex.is_correct, 'correct_index', ci, 'explanation', expl, 'points', 0, 'repeated', true);
  end if;
  ok := (_choice = ci);
  insert into answers (user_id, question_id, cycle_id, week_start, choice, is_correct, points)
  values (auth.uid(), _question_id, c.id, ws, _choice, ok, case when ok then 10 else 0 end);
  return json_build_object('correct', ok, 'correct_index', ci, 'explanation', expl, 'points', case when ok then 10 else 0 end, 'repeated', false);
end $$;
grant execute on function public.submit_answer(text, int) to authenticated;

create or replace function public.submit_memory(_moves int)
returns json language plpgsql security definer set search_path = public as $$
declare c public.cycles; ws date := public.bogota_week_start(); pts int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if _moves < 4 then raise exception 'invalid'; end if;
  c := public.ensure_cycle();
  if exists (select 1 from memory_results where user_id = auth.uid() and week_start = ws) then
    return json_build_object('points', 0, 'repeated', true);
  end if;
  pts := greatest(10, least(40, 40 - (_moves - 4) * 2));
  insert into memory_results (user_id, cycle_id, week_start, moves, points) values (auth.uid(), c.id, ws, _moves, pts);
  return json_build_object('points', pts, 'repeated', false);
end $$;
grant execute on function public.submit_memory(int) to authenticated;

-- Storage policies
create policy "media read" on storage.objects for select using (bucket_id = 'media');
create policy "media upload own" on storage.objects for insert to authenticated with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media delete own" on storage.objects for delete to authenticated using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Seed questions
insert into public.questions (id, challenge_key, position, prompt, options, species, explanation) values
('qq1','quien',1,'¿Qué especie aparece en la fotografía?','{"Iguana verde","Ardilla","Pato","Guatín"}','iguana','Es una iguana verde: cresta de espinas en el lomo y papada bajo el cuello.'),
('qq2','quien',2,'¿Qué especie aparece en la fotografía?','{"Guatín","Ardilla","Iguana verde","Pato"}','ardilla','Es una ardilla: cola larga y esponjosa, siempre ágil entre los árboles.'),
('qq3','quien',3,'¿Qué especie aparece en la fotografía?','{"Pato","Guatín","Ardilla","Iguana verde"}','guatin','Es un guatín: roedor de patas delgadas, cola casi invisible y pelaje dorado.'),
('qq4','quien',4,'¿Qué especie aparece en la fotografía?','{"Iguana verde","Pato","Guatín","Ardilla"}','pato','Es un pato: pico plano y patas palmeadas para nadar.'),
('qq5','quien',5,'¿Cuál de estas especies es un reptil?','{"Ardilla","Guatín","Iguana verde","Pato"}','iguana','La iguana verde es el único reptil: regula su temperatura tomando el sol.'),
('qm1','mito',1,'Mito o realidad: alimentar a los patos con pan es bueno para ellos.','{"Mito","Realidad"}','pato','Mito. El pan no los nutre y puede enfermarlos y contaminar el agua.'),
('qm2','mito',2,'Mito o realidad: la iguana verde es principalmente herbívora.','{"Mito","Realidad"}','iguana','Realidad. Come hojas, flores y frutos.'),
('qm3','mito',3,'Mito o realidad: el guatín ayuda a sembrar árboles al enterrar semillas.','{"Mito","Realidad"}','guatin','Realidad. Entierra semillas como reserva y muchas germinan: es un dispersor.'),
('qm4','mito',4,'Mito o realidad: las ardillas son animales nocturnos.','{"Mito","Realidad"}','ardilla','Mito. Las ardillas son activas de día.'),
('qm5','mito',5,'Mito o realidad: si una iguana pierde la cola, puede regenerarla.','{"Mito","Realidad"}','iguana','Realidad. Puede soltarla para escapar y le crece de nuevo, aunque más corta.'),
('qd1','detectives',1,'¿Qué especie tiene patas palmeadas?','{"Guatín","Pato","Ardilla","Iguana verde"}','pato','Las patas palmeadas del pato funcionan como remos.'),
('qd2','detectives',2,'¿Cuál vive principalmente en las copas de los árboles?','{"Ardilla","Pato","Guatín","Iguana verde"}','ardilla','La ardilla es arbórea, aunque baja al suelo a buscar frutos.'),
('qd3','detectives',3,'¿Qué especie tiene una cola casi imperceptible?','{"Iguana verde","Ardilla","Guatín","Pato"}','guatin','El guatín tiene una cola muy corta, casi oculta en su pelaje.'),
('qd4','detectives',4,'¿Qué especie necesita el sol para calentar su cuerpo?','{"Pato","Iguana verde","Ardilla","Guatín"}','iguana','La iguana es ectotérmica: depende del sol para regular su temperatura.'),
('qd5','detectives',5,'¿Qué especie depende de lagos y humedales del campus?','{"Guatín","Ardilla","Iguana verde","Pato"}','pato','Los patos necesitan cuerpos de agua para alimentarse y descansar.'),
('qh1','harias',1,'Ves un guatín cerca del sendero. ¿Qué haces?','{"Me acerco para una selfie","Lo observo en silencio a distancia","Le lanzo comida","Lo persigo para verlo correr"}','guatin','Observar a distancia evita estresarlo. Es un animal tímido.'),
('qh2','harias',2,'Una ardilla se acerca mientras comes. ¿Qué haces?','{"Le doy un poco de mi comida","Guardo mi comida y la dejo tranquila","La intento tocar","La espanto con un objeto"}','ardilla','No alimentes a la fauna: la comida humana la enferma y la vuelve dependiente.'),
('qh3','harias',3,'Una iguana está tomando el sol en el camino. ¿Qué haces?','{"La rodeo dejándole espacio","La levanto para moverla","Le tomo foto con flash muy cerca","La toco para ver si se mueve"}','iguana','Rodéala con calma: tomar el sol es vital para ella.'),
('qh4','harias',4,'Encuentras basura plástica en el lago de los patos. ¿Qué haces?','{"La ignoro","La recojo si es seguro y la deposito en la caneca","La empujo hacia el centro","Les doy pan para distraerlos"}','pato','Retirar residuos de forma segura protege su hábitat.'),
('qh5','harias',5,'Ves un animal herido en el campus. ¿Qué haces?','{"Lo llevo a mi casa","Aviso al personal de la universidad","Le doy agua con la mano","Lo dejo y no le cuento a nadie"}',null,'Avisa al personal: ellos coordinan con las autoridades ambientales.'),
('qr1','relampago',1,'¿Qué come principalmente el guatín?','{"Insectos","Frutos y semillas","Peces","Carne"}','guatin','Frutos y semillas que caen de los árboles.'),
('qr2','relampago',2,'¿Qué parte usa la iguana para defenderse con latigazos?','{"La cola","Las orejas","El pico","Las alas"}','iguana','Su cola larga y fuerte le sirve para defenderse.'),
('qr3','relampago',3,'¿Por qué las plumas del pato no se empapan?','{"Porque son de plástico","Por un aceite que producen","Porque no se mojan nunca","Porque vuelan rápido"}','pato','Una glándula cerca de la cola produce aceite que impermeabiliza las plumas.'),
('qr4','relampago',4,'¿Qué ayuda a la ardilla a mantener el equilibrio?','{"Sus bigotes","Su cola","Su lengua","Sus orejas"}','ardilla','Su cola esponjosa actúa como contrapeso al saltar.'),
('qr5','relampago',5,'¿Cuál es la mejor forma de fotografiar fauna?','{"Acercarse mucho","Usar zoom y mantener distancia","Atraerla con comida","Tocarla para que pose"}',null,'Usa zoom y respeta su espacio: la foto nunca vale más que su bienestar.');

insert into public.question_answers (question_id, correct_index) values
('qq1',0),('qq2',1),('qq3',0),('qq4',1),('qq5',2),
('qm1',0),('qm2',1),('qm3',1),('qm4',0),('qm5',1),
('qd1',1),('qd2',0),('qd3',2),('qd4',1),('qd5',3),
('qh1',1),('qh2',1),('qh3',0),('qh4',1),('qh5',1),
('qr1',1),('qr2',0),('qr3',1),('qr4',1),('qr5',1);
