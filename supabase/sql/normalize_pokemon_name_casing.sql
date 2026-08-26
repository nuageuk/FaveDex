-- One-off data fix for the get_leaderboard() case-sensitivity bug: rows
-- inserted before api/vote.js normalised casing (or inserted directly,
-- bypassing the API) can have the same pokemon_id voted with different
-- pokemon_name casing, e.g. pokemon_id 470 had both 'leafeon' and
-- 'Leafeon'. A case-sensitive GROUP BY split these into separate
-- leaderboard rows, each undercounting.
--
-- This scopes to every pokemon_id with a genuine case-only duplicate (i.e.
-- distinct pokemon_name values collapse to fewer once lowercased), not just
-- 470, and leaves pokemon_ids with legitimately different names (distinct
-- forms, or simply a single casing so far) untouched.
with target_pokemon as (
  select pokemon_id
  from votes
  group by pokemon_id
  having count(distinct pokemon_name) <> count(distinct lower(pokemon_name))
)
update votes v
set pokemon_name = initcap(v.pokemon_name)
from target_pokemon tp
where v.pokemon_id = tp.pokemon_id
  and v.pokemon_name <> initcap(v.pokemon_name);
