alter table public.cycles add column if not exists in_season boolean not null default true;

create or replace function public.month_species(_d date) returns text language sql immutable as $$
  select (array['ardilla','iguana','pato','guatin'])[((extract(month from _d)::int - 12 + 12) % 4) + 1]
$$;

create or replace function public.is_season(_d date) returns boolean language sql immutable as $$
  select extract(month from _d)::int in (2,3,4,5,6,8,9,10,11)
$$;

update public.cycles set ends_at = starts_at + interval '7 days',
  prize_species = public.month_species((starts_at at time zone 'America/Bogota')::date),
  in_season = public.is_season((starts_at at time zone 'America/Bogota')::date)
where status = 'active';

create or replace function public.ensure_cycle()
 returns cycles language plpgsql security definer set search_path to 'public'
as $function$
declare c public.cycles; w record; d date; s timestamptz;
begin
  loop
    select * into c from cycles where status = 'active' order by starts_at desc limit 1;
    if c.id is null then
      d := date_trunc('week', now() at time zone 'America/Bogota')::date;
      insert into cycles (starts_at, ends_at, prize_species, in_season)
      values (d::timestamp at time zone 'America/Bogota', (d + 7)::timestamp at time zone 'America/Bogota',
              public.month_species(d), public.is_season(d))
      returning * into c;
      return c;
    end if;
    if c.ends_at > now() then return c; end if;
    if c.in_season then
      select * into w from public.leaderboard(c.id) l where l.eligible order by l.rank limit 1;
      insert into winners (cycle_id, user_id, accuracy, completed, correct, prize_species)
      values (c.id, w.user_id, coalesce(w.accuracy,0), coalesce(w.completed,0), coalesce(w.correct,0), c.prize_species)
      on conflict (cycle_id) do nothing;
      if w.user_id is not null then
        insert into forum_posts (user_id, category, title, body)
        values (w.user_id, 'comunidad', '🏆 ¡Tenemos guardián de la semana!',
          '¡Felicitaciones! ' || w.display_name || ' es el guardián de la biodiversidad de esta semana con ' || w.accuracy || '% de respuestas correctas y ' || w.completed || ' retos completados.');
      end if;
    end if;
    update cycles set status = 'closed' where id = c.id;
    d := (c.ends_at at time zone 'America/Bogota')::date;
    insert into cycles (starts_at, ends_at, prize_species, in_season)
    values (c.ends_at, c.ends_at + interval '7 days', public.month_species(d), public.is_season(d));
  end loop;
end $function$;