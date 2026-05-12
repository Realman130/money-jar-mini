-- Alias danh mục (global unique). Chuẩn hóa alias không dấu / thường.

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('cf'), ('cafe'), ('coffee'), ('cà phê'), ('ca phe')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Ăn uống' and c.name = 'Cà phê'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('ăn sáng'), ('an sang')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Ăn uống' and c.name = 'Ăn sáng'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('ăn trưa'), ('an trua')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Ăn uống' and c.name = 'Ăn trưa'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('ăn tối'), ('an toi')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Ăn uống' and c.name = 'Ăn tối'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('xăng'), ('xang'), ('đổ xăng'), ('do xang')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Di chuyển' and c.name = 'Xăng dầu'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('grab'), ('taxi')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Di chuyển' and c.name = 'Taxi / Grab'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('điện'), ('dien')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Nhà cửa' and c.name = 'Điện'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('nước'), ('nuoc')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Nhà cửa' and c.name = 'Nước'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('internet'), ('mạng'), ('mang'), ('wifi')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Nhà cửa' and c.name = 'Internet'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('sách'), ('sach')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Phát triển' and c.name = 'Sách'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('học'), ('hoc'), ('khóa học'), ('khoa hoc')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Phát triển' and c.name = 'Khóa học'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('thuốc'), ('thuoc')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Sức khỏe' and c.name = 'Thuốc'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('khám bệnh'), ('kham benh')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Sức khỏe' and c.name = 'Khám bệnh'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('quần áo'), ('quan ao')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Mua sắm' and c.name = 'Quần áo'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('giày'), ('giay')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Mua sắm' and c.name = 'Giày dép'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('cưới'), ('cuoi'), ('đám cưới'), ('dam cuoi')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Quà tặng' and c.name = 'Cưới hỏi'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('biếu'), ('bieu'), ('gửi ba mẹ'), ('gui ba me')
) as a(alias)
where c.type = 'chi' and c.parent_name = 'Quà tặng' and c.name = 'Biếu gia đình'
on conflict (alias) do nothing;

-- Thu nhập
insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('lương'), ('luong')
) as a(alias)
where c.type = 'thu' and c.parent_name = 'Thu nhập' and c.name = 'Lương'
on conflict (alias) do nothing;

insert into public.category_aliases (category_id, alias)
select c.id, a.alias
from public.categories c
cross join lateral (values
  ('thưởng'), ('thuong')
) as a(alias)
where c.type = 'thu' and c.parent_name = 'Thu nhập' and c.name = 'Thưởng'
on conflict (alias) do nothing;
