-- Hũ + danh mục (toàn cục). Không seed các mục loại trừ theo spec.

insert into public.jars (code, name_vi, description, target_percent, sort_order)
values
  ('essential', 'Thiết yếu', null, 55, 1),
  ('play', 'Hưởng thụ', null, 10, 2),
  ('financial_freedom', 'Tự do tài chính', null, 10, 3),
  ('education', 'Giáo dục', null, 10, 4),
  ('long_term_saving', 'Tiết kiệm dài hạn', null, 10, 5),
  ('give', 'Cho đi', null, 5, 6)
on conflict (code) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
values
  ('thu', 'Thu nhập', 'Lương', '💼', '#22c55e', null, 1),
  ('thu', 'Thu nhập', 'Thưởng', '🎁', '#22c55e', null, 2),
  ('thu', 'Thu nhập', 'Hoa hồng', '💰', '#22c55e', null, 3),
  ('thu', 'Thu nhập', 'Tiền lãi', '📈', '#22c55e', null, 4),
  ('thu', 'Thu nhập', 'Bán đồ', '🛒', '#22c55e', null, 5),
  ('thu', 'Thu nhập', 'Được tặng', '🎀', '#22c55e', null, 6),
  ('thu', 'Thu nhập', 'Hoàn tiền', '↩️', '#22c55e', null, 7),
  ('thu', 'Thu nhập', 'Thu nhập khác', '📎', '#22c55e', null, 8)
on conflict (parent_name, name, type) do nothing;

-- Chi — map jar via subquery in separate statements
insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Ăn uống', 'Ăn sáng', '🌅', '#f97316', j.id, 1 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Ăn uống', 'Ăn trưa', '🍱', '#f97316', j.id, 2 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Ăn uống', 'Ăn tối', '🌙', '#f97316', j.id, 3 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Ăn uống', 'Cà phê', '☕', '#ea580c', j.id, 4 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Ăn uống', 'Đi chợ', '🛒', '#f97316', j.id, 5 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Ăn uống', 'Nhà hàng', '🍽️', '#f97316', j.id, 6 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Nhà cửa', 'Tiền thuê', '🏠', '#3b82f6', j.id, 10 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Nhà cửa', 'Điện', '💡', '#3b82f6', j.id, 11 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Nhà cửa', 'Nước', '💧', '#3b82f6', j.id, 12 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Nhà cửa', 'Internet', '📶', '#3b82f6', j.id, 13 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Nhà cửa', 'Điện thoại', '📱', '#3b82f6', j.id, 14 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Nhà cửa', 'Đồ gia dụng', '🪑', '#3b82f6', j.id, 15 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Di chuyển', 'Xăng dầu', '⛽', '#8b5cf6', j.id, 20 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Di chuyển', 'Gửi xe', '🅿️', '#8b5cf6', j.id, 21 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Di chuyển', 'Taxi / Grab', '🚕', '#8b5cf6', j.id, 22 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Di chuyển', 'Bảo trì xe', '🔧', '#8b5cf6', j.id, 23 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Di chuyển', 'Rửa xe', '🧼', '#8b5cf6', j.id, 24 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Sức khỏe', 'Thuốc', '💊', '#14b8a6', j.id, 30 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Sức khỏe', 'Khám bệnh', '🏥', '#14b8a6', j.id, 31 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Sức khỏe', 'Thể thao', '🏃', '#14b8a6', j.id, 32 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Sức khỏe', 'Hớt tóc', '✂️', '#14b8a6', j.id, 33 from public.jars j where j.code = 'essential'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Mua sắm', 'Quần áo', '👕', '#ec4899', j.id, 40 from public.jars j where j.code = 'play'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Mua sắm', 'Giày dép', '👟', '#ec4899', j.id, 41 from public.jars j where j.code = 'play'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Mua sắm', 'Thiết bị điện tử', '💻', '#ec4899', j.id, 42 from public.jars j where j.code = 'play'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Mua sắm', 'Gadget', '📱', '#ec4899', j.id, 43 from public.jars j where j.code = 'play'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Giải trí', 'Phim', '🎬', '#f43f5e', j.id, 50 from public.jars j where j.code = 'play'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Giải trí', 'Du lịch', '✈️', '#f43f5e', j.id, 51 from public.jars j where j.code = 'play'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Giải trí', 'Gặp bạn bè', '👥', '#f43f5e', j.id, 52 from public.jars j where j.code = 'play'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Giải trí', 'Giải trí khác', '🎮', '#f43f5e', j.id, 53 from public.jars j where j.code = 'play'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Phát triển', 'Sách', '📚', '#0ea5e9', j.id, 60 from public.jars j where j.code = 'education'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Phát triển', 'Khóa học', '🎓', '#0ea5e9', j.id, 61 from public.jars j where j.code = 'education'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Phát triển', 'Workshop', '🧑‍🏫', '#0ea5e9', j.id, 62 from public.jars j where j.code = 'education'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Phát triển', 'Công cụ học tập', '✏️', '#0ea5e9', j.id, 63 from public.jars j where j.code = 'education'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Tự do tài chính', 'Cổ phiếu', '📊', '#a855f7', j.id, 70 from public.jars j where j.code = 'financial_freedom'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Tự do tài chính', 'Vàng', '🥇', '#a855f7', j.id, 71 from public.jars j where j.code = 'financial_freedom'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Tự do tài chính', 'Bảo hiểm', '🛡️', '#a855f7', j.id, 72 from public.jars j where j.code = 'financial_freedom'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Tự do tài chính', 'Đầu tư khác', '📉', '#a855f7', j.id, 73 from public.jars j where j.code = 'financial_freedom'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Dự phòng', 'Quỹ khẩn cấp', '🆘', '#64748b', j.id, 80 from public.jars j where j.code = 'long_term_saving'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Dự phòng', 'Mua sắm lớn', '🛋️', '#64748b', j.id, 81 from public.jars j where j.code = 'long_term_saving'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Dự phòng', 'Sửa chữa phát sinh', '🔨', '#64748b', j.id, 82 from public.jars j where j.code = 'long_term_saving'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Quà tặng', 'Cưới hỏi', '💒', '#f472b6', j.id, 90 from public.jars j where j.code = 'give'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Quà tặng', 'Biếu gia đình', '🎁', '#f472b6', j.id, 91 from public.jars j where j.code = 'give'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Quà tặng', 'Từ thiện', '❤️', '#f472b6', j.id, 92 from public.jars j where j.code = 'give'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Quà tặng', 'Sinh nhật', '🎂', '#f472b6', j.id, 93 from public.jars j where j.code = 'give'
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Khác', 'Chi khác', '📌', '#94a3b8', null, 100
on conflict (parent_name, name, type) do nothing;

insert into public.categories (type, parent_name, name, icon, color, jar_id, sort_order)
select 'chi', 'Khác', 'Chưa phân loại', '❔', '#94a3b8', null, 101
on conflict (parent_name, name, type) do nothing;
