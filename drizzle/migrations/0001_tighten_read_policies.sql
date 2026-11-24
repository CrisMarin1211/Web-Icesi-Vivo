drop policy if exists "fl read" on public.forum_likes;
create policy "fl read" on public.forum_likes for select to authenticated
using (exists (select 1 from public.forum_posts p where p.id = post_id and (not p.hidden or p.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));

drop policy if exists "fc read" on public.forum_comments;
create policy "fc read" on public.forum_comments for select to authenticated
using (exists (select 1 from public.forum_posts p where p.id = post_id and (not p.hidden or p.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));

drop policy if exists "pc read" on public.photo_comments;
create policy "pc read" on public.photo_comments for select to authenticated
using (exists (select 1 from public.photos ph where ph.id = photo_id and (ph.status = 'approved' or ph.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));

drop policy if exists "likes read" on public.photo_likes;
create policy "likes read" on public.photo_likes for select to authenticated
using (exists (select 1 from public.photos ph where ph.id = photo_id and (ph.status = 'approved' or ph.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated
using (auth.uid() is not null);

drop policy if exists "w read" on public.winners;
create policy "w read" on public.winners for select to authenticated
using (auth.uid() is not null);

drop policy if exists "media read" on storage.objects;
create policy "media read" on storage.objects for select to authenticated
using (bucket_id = 'media' and (
  (storage.foldername(name))[1] = auth.uid()::text
  or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.photos ph where ph.image_url = name and ph.status = 'approved')
  or exists (select 1 from public.forum_posts fp where fp.image_url = name and not fp.hidden)
  or exists (select 1 from public.profiles pr where pr.avatar_url = name)
));