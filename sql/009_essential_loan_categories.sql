-- Them danh muc chi thuoc hu Thiet yeu cho lai vay va tra gop.

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Tài chính cá nhân', 'Lãi vay', '💳', '#ef4444', j.id, 34
from public.jars j
where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Tài chính cá nhân', 'Trả góp', '🧾', '#f59e0b', j.id, 35
from public.jars j
where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, x.alias
from public.categories c
cross join (
  values
    ('lai vay'),
    ('chi lai vay'),
    ('chi lai vay thau chi'),
    ('lai vay thau chi'),
    ('tra lai vay'),
    ('tien lai vay'),
    ('thau chi'),
    ('lai thau chi')
) as x(alias)
where c.type = 'chi' and c.parent_name = 'Tài chính cá nhân' and c.name = 'Lãi vay'
on conflict do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, x.alias
from public.categories c
cross join (
  values
    ('tra gop'),
    ('dong tra gop'),
    ('tra gop hang thang'),
    ('gop iphone'),
    ('gop xe'),
    ('gop may tinh')
) as x(alias)
where c.type = 'chi' and c.parent_name = 'Tài chính cá nhân' and c.name = 'Trả góp'
on conflict do nothing;

update public.transactions t
set category_id = c.id
from public.categories c
where c.type = 'chi'
  and c.parent_name = 'Tài chính cá nhân'
  and c.name = 'Lãi vay'
  and t.type = 'chi'
  and (
    lower(coalesce(t.note, '')) like '%lãi vay%'
    or lower(coalesce(t.note, '')) like '%lai vay%'
    or lower(coalesce(t.note, '')) like '%thấu chi%'
    or lower(coalesce(t.note, '')) like '%thau chi%'
    or lower(coalesce(t.raw_input, '')) like '%lãi vay%'
    or lower(coalesce(t.raw_input, '')) like '%lai vay%'
    or lower(coalesce(t.raw_input, '')) like '%thấu chi%'
    or lower(coalesce(t.raw_input, '')) like '%thau chi%'
  );

update public.transactions t
set category_id = c.id
from public.categories c
where c.type = 'chi'
  and c.parent_name = 'Tài chính cá nhân'
  and c.name = 'Trả góp'
  and t.type = 'chi'
  and (
    lower(coalesce(t.note, '')) like '%trả góp%'
    or lower(coalesce(t.note, '')) like '%tra gop%'
    or lower(coalesce(t.raw_input, '')) like '%trả góp%'
    or lower(coalesce(t.raw_input, '')) like '%tra gop%'
  );
