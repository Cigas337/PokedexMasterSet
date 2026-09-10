-- Atomic, exact-key removal. Uses the caller's existing table permissions and RLS.
create or replace function public.m7_remove_owned_variants(p_pokemon_ids bigint[], p_item_keys text[])
returns table(pokemon_id bigint, card boolean, full_art boolean, card_details jsonb)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_row record;
  details jsonb;
  owned jsonb;
  removed_keys text[];
  featured text;
  has_cards boolean;
  seen integer := 0;
  expected integer;
begin
  if coalesce(cardinality(p_pokemon_ids),0) not between 1 and 1025
     or coalesce(cardinality(p_item_keys),0) not between 1 and 50
     or exists(select 1 from unnest(p_item_keys) k where k is null or length(k)=0 or length(k)>1024)
     or exists(select 1 from unnest(p_pokemon_ids) id where id is null or id not between 1 and 1025) then
    raise exception 'Invalid card removal request';
  end if;
  select count(distinct id) into expected from unnest(p_pokemon_ids) id;

  -- Lock in Pokémon order to avoid lost updates and deadlocks across shared cards.
  for current_row in
    select pc.pokemon_id, pc.card, pc.full_art, pc.card_details
    from public.pokemon_cards pc
    where pc.pokemon_id=any(p_pokemon_ids)
    order by pc.pokemon_id
    for update
  loop
    seen := seen+1;
    details := case when jsonb_typeof(current_row.card_details)='object' then current_row.card_details else '{}'::jsonb end;
    owned := case when jsonb_typeof(details->'owned')='object' then details->'owned' else '{}'::jsonb end;
    select array_agg(o.key) into removed_keys
    from jsonb_each(owned) o
    where o.key=any(p_item_keys)
       or (coalesce(nullif(o.value->>'id',''),split_part(o.key,'@@',1)) || '@@' ||
           coalesce(nullif(o.value->>'variantKey',''),nullif(split_part(o.key,'@@',2),''),'default'))=any(p_item_keys);

    if coalesce(cardinality(removed_keys),0)>0 then
      owned := owned-removed_keys;
      featured := details->>'featured';
      if featured is not null and not exists(
        select 1 from jsonb_each(owned) o
        where o.key=featured
           or (coalesce(nullif(o.value->>'id',''),split_part(o.key,'@@',1)) || '@@' ||
               coalesce(nullif(o.value->>'variantKey',''),nullif(split_part(o.key,'@@',2),''),'default'))=featured
      ) then
        select o.key into featured from jsonb_each(owned) o order by o.key limit 1;
      end if;
      has_cards := owned<>'{}'::jsonb;
      details := details || jsonb_build_object('owned',owned,'featured',featured);
      return query
        update public.pokemon_cards pc
        set card=has_cards, full_art=has_cards and current_row.full_art is true, card_details=details
        where pc.pokemon_id=current_row.pokemon_id
        returning pc.pokemon_id, pc.card, pc.full_art, pc.card_details;
    else
      return query select current_row.pokemon_id, current_row.card, current_row.full_art, current_row.card_details;
    end if;
  end loop;
  if seen<>expected then
    raise exception 'A Pokémon row is unavailable; reload the collection';
  end if;
end;
$$;

revoke all on function public.m7_remove_owned_variants(bigint[],text[]) from public;
grant execute on function public.m7_remove_owned_variants(bigint[],text[]) to anon, authenticated;
