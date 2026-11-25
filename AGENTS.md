<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Scoring is computed only in SECURITY DEFINER SQL (submit_answer, submit_memory, leaderboard, ensure_cycle); answer keys live in question_answers with no client grants — prevents cheating.
- Weekly cycles (season-gated by is_season, animal by month_species) close lazily inside ensure_cycle() (called on page load/answer) — no cron needed.
- Media bucket is private (workspace blocks public buckets); tables store storage paths and the UI renders signed URLs via MediaImage/Avatar.
- The campus map lazy-loads Leaflet, uses OpenStreetMap tiles, and renders only confirmed database coordinates; never invent monument locations.
- Monument codes remain in an ungranted RLS table; authenticated SQL unlocks and an answer-insert trigger enforce access before the existing weekly scoring awards points.
