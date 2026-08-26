-- Aggregates votes by pokemon_id + pokemon_name (so regional/alternate forms
-- with the same base pokemon_id but a different pokemon_name are counted as
-- separate leaderboard entries, matching the client's aggregateVotes() key).
--
-- Grouping uses lower(pokemon_name) rather than pokemon_name directly: older
-- rows have inconsistent casing (e.g. 'leafeon' vs 'Leafeon' for the same
-- pokemon_id), and a case-sensitive GROUP BY was splitting those into
-- separate leaderboard rows with undercounted totals instead of one combined
-- count. The displayed name is normalised via initcap(min(...)) so the
-- output is deterministic regardless of which casing variant happens to
-- sort first, and matches the title-case convention used elsewhere.
--
-- SECURITY INVOKER (the default) is intentional: the function must run with
-- the caller's privileges so the existing RLS policies on `votes` apply the
-- same way they do for the flat select the client used to run directly.
create or replace function get_leaderboard()
returns table (
  pokemon_id integer,
  pokemon_name text,
  generation integer,
  count bigint
)
language sql
stable
as $$
  select
    pokemon_id,
    initcap(min(pokemon_name)) as pokemon_name,
    generation,
    count(*) as count
  from votes
  group by pokemon_id, lower(pokemon_name), generation
  order by count desc;
$$;

-- Supabase exposes public-schema functions over PostgREST; make sure the
-- anon/authenticated roles used by the client's publishable key can call it.
grant execute on function get_leaderboard() to anon, authenticated;
