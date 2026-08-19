-- Safety net against duplicate vote submissions: even if the frontend's
-- isSubmitting guard is bypassed (e.g. a retried/concurrent request), the DB
-- rejects a second vote from the same username for the same pokemon_id.
--
-- NULL usernames (anonymous votes) are exempt from this constraint, since
-- Postgres treats NULLs as distinct for uniqueness purposes — anonymous
-- voting is still limited separately by the daily rate limit in api/vote.js.
do $$
begin
  alter table public.votes
    add constraint votes_username_pokemon_id_key unique (username, pokemon_id);
exception
  when duplicate_object then
    raise notice 'constraint votes_username_pokemon_id_key already exists, skipping';
end $$;
