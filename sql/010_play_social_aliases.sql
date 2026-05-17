-- Gan cac tu khoa di nhau / nhau / an nhau vao hu Huong thu
-- thong qua category "Gặp bạn bè".

insert into public.category_aliases (category_id, alias)
select c.id, x.alias
from public.categories c
cross join (
  values
    ('đi nhậu'),
    ('di nhau'),
    ('nhậu'),
    ('nhau'),
    ('ăn nhậu'),
    ('an nhau')
) as x(alias)
where c.type = 'chi'
  and c.parent_name = 'Giải trí'
  and c.name = 'Gặp bạn bè'
on conflict (alias) do nothing;

update public.transactions t
set category_id = c.id
from public.categories c
where c.type = 'chi'
  and c.parent_name = 'Giải trí'
  and c.name = 'Gặp bạn bè'
  and t.type = 'chi'
  and (
    lower(coalesce(t.note, '')) like '%đi nhậu%'
    or lower(coalesce(t.note, '')) like '%di nhau%'
    or lower(coalesce(t.note, '')) like '%nhậu%'
    or lower(coalesce(t.note, '')) like '%nhau%'
    or lower(coalesce(t.note, '')) like '%ăn nhậu%'
    or lower(coalesce(t.note, '')) like '%an nhau%'
    or lower(coalesce(t.raw_input, '')) like '%đi nhậu%'
    or lower(coalesce(t.raw_input, '')) like '%di nhau%'
    or lower(coalesce(t.raw_input, '')) like '%nhậu%'
    or lower(coalesce(t.raw_input, '')) like '%nhau%'
    or lower(coalesce(t.raw_input, '')) like '%ăn nhậu%'
    or lower(coalesce(t.raw_input, '')) like '%an nhau%'
  );
