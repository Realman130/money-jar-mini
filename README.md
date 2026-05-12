# Money Jar Mini

Telegram Mini App quản lý thu chi cá nhân (React + TypeScript + Tailwind + Supabase).

## Cài đặt Supabase

Trong SQL Editor, chạy **theo thứ tự**:

1. `sql/001_init_schema.sql`
2. `sql/002_seed_jars_categories.sql`
3. `sql/003_seed_wallets_fn.sql`
4. `sql/005_category_aliases.sql`
5. `sql/006_report_views.sql`
6. `sql/007_mjm_rls_dev.sql` — **chỉ dùng cho dev** (anon full access). Production cần RLS theo user thật.

## Env

```bash
cp .env.example .env
# Điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY
# Dev ngoài Telegram: VITE_DEV_TELEGRAM_USER_ID=<telegram_user_id>
```

## Chạy local

```bash
npm install
npm run dev
# mặc định http://localhost:5174
```

## Gắn vào Telegram

1. Tạo bot BotFather, bật **Menu Button** / **Mini App** trỏ tới URL HTTPS (Vercel / Cloudflare Pages / ngrok).
2. Trong BotFather: `/newapp` hoặc cấu hình Web App URL trỏ tới bản build `npm run build` (`dist/`).

## Kiến trúc

- `src/lib/` — Supabase, Telegram WebApp, parser nhập nhanh, tiền, ngày.
- `src/services/` — CRUD & báo cáo.
- `src/pages/` — 8 màn hình chính + hub “Thêm”.
- `sql/` — schema, seed, views, RLS dev.

## Lưu ý bảo mật

File `007_mjm_rls_dev.sql` cho phép **anon đọc/ghi toàn bộ** để Mini App chạy nhanh. Trước khi public, thay bằng xác thực (ví dụ xác minh `initData` Telegram ở Edge Function và cấp JWT có `telegram_user_id`).
