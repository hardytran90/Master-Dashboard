# Master Dashboard — Setup Log

> Tài liệu ghi lại toàn bộ quá trình dựng khung dự án từ đầu, dùng để đọc lại nắm cấu trúc hoặc build lại từ đầu nếu cần. Cập nhật đến bước: **module fitness có luồng auth → route bảo vệ hoàn chỉnh** — `POST /auth/register`, `POST /auth/login`, middleware `requireAuth`, và `GET /activities` (Prisma + pagination + filter) đã test thành công qua Postman/curl.

---

## 1. Tổng quan kiến trúc

Gộp 3 project cũ (My Run Log, Coding Tracker, Blog cá nhân dự tính) thành 1 monorepo duy nhất, theo **module registry pattern**: mỗi tính năng (fitness, coding, blog, books) là 1 module độc lập, tự đăng ký route + widget của nó vào 1 danh sách trung tâm — thêm tính năng mới không cần sửa code cũ.

**4 nhóm cốt lõi:**
- **Modules** — 4 domain: fitness, coding, blog, books (cùng 1 khuôn: `module.js` + `routes.jsx` + `pages/`)
- **Core logic** — module registry, App router, middleware auth (JWT)
- **Helper/Shared** — component dùng chung (Heatmap, ProgressBar, BarChart...), hook dùng chung (useApi, useAuth, useStreak...), integrations adapter (Strava/GitHub/WakaTime cùng interface)
- **Database** — Prisma schema, MySQL

---

## 2. Tech stack

| Tầng | Công nghệ |
|---|---|
| Frontend | React (Vite) + Tailwind CSS v4 |
| Backend | Express + Node.js |
| ORM / Migration | Prisma |
| Database | MySQL |
| Quản lý monorepo | npm workspaces |
| Auth | JWT (Bearer token) + OAuth (Strava, GitHub, WakaTime) |

---

## 3. Cấu trúc thư mục

```
master-dashboard/
├── apps/
│   ├── web/                        # Frontend — React + Tailwind
│   │   └── src/
│   │       ├── app/                # Khung app: routing tổng, layout
│   │       │   ├── main.jsx
│   │       │   └── App.jsx
│   │       ├── index.css           # entry Tailwind (@import "tailwindcss";)
│   │       ├── modules/            # Registry — khai báo module nào đang có
│   │       │   └── index.js
│   │       ├── features/           # 1 folder = 1 domain
│   │       │   ├── fitness/
│   │       │   ├── coding/
│   │       │   ├── blog/
│   │       │   └── books/
│   │       ├── shared/
│   │       │   ├── components/     # Card, ProgressBar, Heatmap, BarChart...
│   │       │   └── hooks/          # useApi, useAuth, useStreak...
│   │       └── lib/                # api client wrapper
│   │
│   └── api/                        # Backend — Express + Node
│       └── src/
│           ├── routes/             # auth.js, activities.js, coding.js, posts.js, goals.js
│           ├── integrations/       # strava.js, github.js, wakatime.js
│           ├── core/
│           │   ├── middleware/
│           │   │   └── requireAuth.js   # đặt tên riêng, tránh trùng routes/auth.js
│           │   └── prisma.js
│           └── server.js
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── packages/
│   └── shared-types/               # constants/enum dùng chung web + api
│
├── docs/
│   └── setup-log.md                # chính file này
│
├── package.json                    # root — khai báo workspaces
├── .env                            # DATABASE_URL, JWT_SECRET...
└── .gitignore
```

---

## 4. Các bước setup chi tiết

### 4.1. Khởi tạo repo + npm workspaces

```bash
mkdir master-dashboard && cd master-dashboard
git init
npm init -y
```

Sửa `package.json` ở root:
```json
{
  "name": "master-dashboard",
  "private": true,
  "workspaces": ["apps/*"]
}
```

Tạo khung thư mục rỗng:
```bash
mkdir -p apps/web/src/{app,modules,features,shared/components,shared/hooks,lib}
mkdir -p apps/api/src/{modules,integrations,core/middleware}
mkdir -p prisma
mkdir -p packages/shared-types
mkdir -p docs
```

**Quy tắc quan trọng:** mọi lệnh `npm install <package>` từ root **bắt buộc** phải có `--workspace=apps/xxx`, nếu không package sẽ bị cài nhầm vào `package.json` gốc thay vì đúng app con.

```bash
# Cài đúng cách — ví dụ
npm install express --workspace=apps/api
npm install -D prisma --workspace=apps/api

# Nếu lỡ cài sai (thiếu --workspace), sửa bằng cách:
npm uninstall <package>                          # gỡ ở root
npm install <package> --workspace=apps/api        # cài lại đúng chỗ
```

Chạy các lệnh script của từng app: dùng `--workspace=apps/xxx` khi đứng ở root, hoặc chạy trực tiếp `npm run dev` khi đã `cd` vào đúng thư mục app đó (không cần cờ workspace nữa).

### 4.2. `apps/web` — React (Vite) + Tailwind CSS v4

```bash
cd apps/web
npm create vite@latest . -- --template react
npm install
```

**Tailwind v4** (khác hẳn cách setup v3 cũ — không còn lệnh `npx tailwindcss init -p`, không cần `postcss.config.js` hay `tailwind.config.js`):

```bash
npm install tailwindcss @tailwindcss/vite
```

`vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

`src/index.css` — thay toàn bộ nội dung mặc định bằng đúng 1 dòng:
```css
@import "tailwindcss";
```

**Dọn lại cấu trúc theo khung đã thống nhất:**
```bash
mv src/main.jsx src/app/main.jsx
rm src/App.css src/App.jsx   # sẽ viết lại App.jsx sau
```

Sửa `index.html` (root của `apps/web`):
```html
<script type="module" src="/src/app/main.jsx"></script>
```

Sửa lại import trong `src/app/main.jsx` cho khớp vị trí file mới (vì `main.jsx` giờ nằm trong `app/`, lùi 1 cấp để tới `index.css` và `App.jsx`):
```jsx
import '../index.css'
import App from './App.jsx'
```

Tạo tạm `src/app/App.jsx` (bản tối giản để xác nhận khung chạy được, sẽ thay bằng module registry thật sau):
```jsx
export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-semibold text-gray-800">
        Master Dashboard — khung đang dựng
      </h1>
    </div>
  );
}
```

Kiểm tra chạy được:
```bash
npm run dev   # từ trong apps/web, hoặc: npm run dev --workspace=apps/web từ root
```

### 4.3. `apps/api` — Express + Node

```bash
cd ../api
npm init -y
npm install express cors dotenv
npm install -D nodemon
```

`package.json` của `apps/api` — thêm:
```json
{
  "type": "module",
  "scripts": { "dev": "nodemon src/server.js" }
}
```

`src/server.js` (khung tối giản ban đầu):
```js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
```

### 4.4. Prisma + MySQL

```bash
cd ../..   # về root
npm install -D prisma --workspace=apps/api
npm install @prisma/client --workspace=apps/api
```

**Lưu ý quan trọng:** `npx prisma init` **không hỗ trợ cờ `--schema`** — cờ này chỉ dùng được cho các lệnh khác (`generate`, `migrate`, `db pull`, `studio`...). Dùng sai sẽ khiến `init` không tạo được file mà không báo lỗi rõ ràng.

Cách tạo đúng — chạy `init` không kèm `--schema`:
```bash
npx prisma init --datasource-provider mysql
```

Hoặc tạo thủ công (đáng tin cậy hơn, không phụ thuộc phiên bản CLI):
```bash
mkdir -p prisma
touch prisma/schema.prisma
touch .env
```

**Lưu ý quan trọng — Prisma 7 đổi cách cấu hình so với bản cũ:**
- `url` trong block `datasource` **không còn được phép** viết trực tiếp trong `schema.prisma` nữa — phải khai báo qua file `prisma.config.ts` ở root.
- `PrismaClient` lúc chạy code (runtime) **bắt buộc phải truyền `adapter`** (driver adapter) cho mọi loại database, kể cả MySQL — không tự kết nối qua engine ngầm như Prisma 6 trở về trước.

`prisma/schema.prisma` — phần khung đầu (không có `url`):
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
}
```

`prisma.config.ts` ở root — nơi khai báo `url` cho CLI dùng khi chạy `migrate`/`generate`:
```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

`.env` ở root:
```
DATABASE_URL="mysql://user:password@localhost:3306/master_dashboard"
```

Sau khi có đầy đủ schema (9 model: `User`, `OAuthConnection`, `Activity`, `CodingLog`, `Goal`, `Post`, `BookReview`, `Tag`, `PostTag` — xem chi tiết ở mục 5), chạy migration đầu tiên:

```bash
npx prisma migrate dev --name init --schema=prisma/schema.prisma
npx prisma generate --schema=prisma/schema.prisma
```

✅ **Trạng thái đã xác nhận:** Prisma Client đã generate thành công, MySQL database đã được tạo theo schema.

### 4.5. Kết nối Prisma Client vào Express (`core/prisma.js`)

Vì Prisma 7 yêu cầu driver adapter, cần cài thêm:
```bash
npm install @prisma/adapter-mariadb --workspace=apps/api
```

`apps/api/src/core/prisma.js` — bản hoàn chỉnh:
```js
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../../.env') }); // load .env từ root

import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis;

// Adapter cần từng field riêng (host/user/password/database),
// không parse được url gộp, nên phải tách từ DATABASE_URL
const dbUrl = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 3306,
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ''),
  connectTimeout: 5000,
  idleTimeout: 300,
});

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Cách test nhanh trước khi đụng vào route** — tạo `core/test-connection.js` gọi `prisma.$connect()` + 1 query đơn giản (`prisma.user.count()`), chạy bằng `node src/core/test-connection.js` từ `apps/api`. Mục đích: tách riêng lỗi "kết nối DB" khỏi lỗi "route Express", tránh debug lẫn lộn.

✅ **Trạng thái đã xác nhận:** Kết nối thành công, query chạy được, Prisma Client nhận diện đủ 9 model (`user`, `oAuthConnection`, `activity`, `codingLog`, `goal`, `post`, `bookReview`, `tag`, `postTag`).

### 4.6. Module fitness — auth + route `GET /activities`

**Bước 1 — Route đăng ký/đăng nhập (`apps/api/src/routes/auth.js`):**

`POST /api/auth/register` — nhận `email` + `password`, hash password bằng `bcrypt.hash`, tạo user qua `prisma.user.create`, trả về JWT ký bằng `jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })`.

`POST /api/auth/login` — tìm user qua `prisma.user.findUnique({ where: { email } })`, so khớp password bằng `bcrypt.compare`, trả JWT theo cùng cách trên.

**Bước 2 — Middleware xác thực (`apps/api/src/core/middleware/requireAuth.js`):**

Đọc header `Authorization: Bearer <token>`, verify bằng `jwt.verify(token, process.env.JWT_SECRET)`, gắn `req.user = { id: decoded.userId }` rồi gọi `next()` cho các route phía sau dùng. Thiếu/sai/hết hạn token → trả `401`, chặn không cho đi tiếp.

**Bước 3 — Route dữ liệu (`apps/api/src/routes/activities.js`):**

`GET /activities` (được bảo vệ bởi `requireAuth`) — đọc `req.user.id` để chỉ trả activity của đúng user đó, hỗ trợ filter `type`/`from`/`to` và pagination `page`/`limit`, dùng `prisma.activity.findMany(...)` + `prisma.activity.count(...)` (chạy song song bằng `Promise.all`) thay cho `pool.query` thủ công của My Run Log cũ.

**Bước 4 — Mount route vào `server.js`:**

```js
import authRouter from './routes/auth.js';
import activitiesRouter from './routes/activities.js';

app.use('/api', authRouter);       // → POST /api/auth/register, /api/auth/login
app.use('/api', activitiesRouter); // → GET /api/activities
```

**Bước 5 — Test bằng Postman:** đăng ký user test qua `/auth/register` (nhận token luôn), gọi `/auth/login` xác nhận hoạt động, gắn token vào tab Authorization → Bearer Token, gọi `GET /activities` kèm query params `page`/`limit`/`type`/`from`/`to`.

✅ **Trạng thái đã xác nhận:** toàn bộ luồng `register → login → requireAuth → GET /activities` chạy đúng như kỳ vọng, response trả `{ data: [...], pagination: {...} }`.

---

## 5. Database schema — tóm tắt các bảng

| Bảng | Vai trò |
|---|---|
| `users` | Tài khoản, email/password hash |
| `oauth_connections` | Gộp token của mọi provider (Strava, GitHub, WakaTime) vào 1 bảng, thay vì rải rác như code cũ |
| `activities` | Dữ liệu chạy/đạp xe — kế thừa cấu trúc từ My Run Log |
| `coding_logs` | Số giây code theo ngày, theo nguồn (wakatime/github) — lưu lịch sử thật, không chỉ fetch trực tiếp như Coding Tracker cũ |
| `goals` | 1 bảng tổng quát cho mọi domain (`domain`, `metric_type`, `period`) thay vì viết riêng logic từng loại |
| `posts` | Dùng chung cho cả blog và book review (`type`: blog / book_review) |
| `book_reviews` | Field đặc thù của review sách, quan hệ 1-1 với `posts` |
| `tags` + `post_tags` | Many-to-many, liên kết chéo nội dung |

Schema đầy đủ (Prisma models, field, quan hệ, index) đã được viết trong `prisma/schema.prisma` — xem trực tiếp file đó để tham chiếu chính xác nhất.

---

## 6. Lỗi đã gặp & cách xử lý (troubleshooting log)

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `npm error could not determine executable to run` khi `npx tailwindcss init -p` | Tailwind v4 đã bỏ lệnh `init`, đổi cách setup hoàn toàn | Dùng `@tailwindcss/vite` plugin thay vì `tailwind.config.js` + `postcss.config.js` |
| `npm error No workspaces found: --workspace=apps/web` | Đang đứng trong `apps/web` mà vẫn dùng cờ `--workspace` (cờ này chỉ dùng khi đứng ở root) | Chạy `npm run dev` trực tiếp (không cờ) khi đã ở trong thư mục app, hoặc `cd` về root rồi mới thêm `--workspace` |
| `npm error No workspaces found: --workspace=apps/api` dù đứng đúng ở root | Trước đó từng `cd` vào `apps/web`/`apps/api` và `npm install` trực tiếp, phá vỡ liên kết workspace | Chạy `npm install` (không cờ) tại root để npm quét và liên kết lại `apps/*` |
| Cài `prisma`/`@prisma/client` thiếu `--workspace` → bị ghi nhầm vào `package.json` root | Quên thêm cờ `--workspace=apps/api` | `npm uninstall` ở root, cài lại có `--workspace=apps/api` |
| `npx prisma init --schema=...` không tạo được file | `init` không hỗ trợ cờ `--schema` | Chạy `npx prisma init --datasource-provider mysql` (không cờ `--schema`) hoặc tạo file thủ công |
| `Failed to resolve import "./index.css"` | Đã `mv main.jsx` vào `app/` nhưng đường dẫn import chưa cập nhật theo vị trí mới | Sửa thành `import '../index.css'` |
| `Failed to resolve import "./App.jsx"` | `App.jsx` đã bị xoá ở bước dọn dẹp, chưa tạo lại | Tạo `App.jsx` tối giản để xác nhận khung chạy, viết đầy đủ sau |
| `Cannot find module '.prisma/client/default'` | Prisma Client chưa generate đúng chỗ, hoặc generator dùng `output` custom nên không nằm ở `node_modules/@prisma/client` mặc định | Chạy `npx prisma generate --schema=prisma/schema.prisma`; kiểm tra `generator client` trong schema có `output` custom không |
| `The datasource property 'url' is no longer supported in schema files` | Prisma 7 cấm khai báo `url` trong `datasource` của `schema.prisma` | Bỏ `url` khỏi `schema.prisma`, chuyển sang khai báo trong `prisma.config.ts` |
| `SyntaxError: Unexpected token 'export'` khi chạy file Client generate ra | Generator `prisma-client` (engine mới) xuất code chứa cú pháp TypeScript (`export type ...`) dù đổi đuôi file thành `.js` — không thực sự compile | Đổi lại generator về `prisma-client-js` (cổ điển) — xuất JS thuần vào `node_modules/@prisma/client`, không lỗi cú pháp |
| `pool timeout: failed to retrieve a connection from pool` khi query qua adapter | `@prisma/adapter-mariadb` không tự parse được `DATABASE_URL` dạng chuỗi gộp | Parse `DATABASE_URL` bằng `new URL()` thành từng field (`host`, `port`, `user`, `password`, `database`) rồi truyền riêng vào `PrismaMariaDb({...})` |
| `TypeError: Invalid URL` — input là `undefined` | `.env` nằm ở root nhưng `node` chạy từ `apps/api`, `dotenv/config` mặc định không tìm thấy | Dùng `dotenv`'s `config({ path: ... })` trỏ tuyệt đối tới `.env` ở root thay vì import `'dotenv/config'` mặc định |
| `prisma.user.count()` báo lỗi vì file `schema.prisma` bị rỗng (mất hết model) | Trong lúc sửa qua lại phần `generator`/`datasource`, nội dung `model` bị ghi đè mất mà không để ý | Tìm lại schema đầy đủ đã lưu trong lịch sử chat trước đó (`conversation_search`), khôi phục nguyên vẹn; nên cân nhắc `git commit` schema sau mỗi lần chỉnh sửa để tránh mất lại |

---

## 7. Trạng thái hiện tại

- [x] Repo + npm workspaces
- [x] `apps/web` chạy được (Vite + React + Tailwind v4)
- [x] `apps/api` chạy được (Express, `/api/health` trả `{ok:true}`)
- [x] Prisma schema đầy đủ 9 bảng
- [x] Migration chạy thành công, MySQL database đã tạo
- [x] Prisma Client đã generate
- [x] Kết nối Prisma Client vào Express (`core/prisma.js`) — đã test thành công qua `test-connection.js`, nhận đủ 9 model
- [x] Route `POST /auth/register` + `POST /auth/login` (bcrypt hash + JWT)
- [x] Middleware `requireAuth` (`core/middleware/requireAuth.js`) — verify JWT, gắn `req.user.id`
- [x] Route `GET /activities` (Prisma + filter + pagination), bảo vệ bởi `requireAuth` — đã test end-to-end qua Postman
- [ ] Route `POST /activities` (tạo activity thủ công, để có dữ liệu test thật)
- [ ] Module registry rỗng bên frontend (`modules/index.js`)
- [ ] Sync dữ liệu Strava (`integrations/strava.js`, dùng bảng `oauth_connections`)
- [ ] Module coding, blog, books
- [ ] Trang Dashboard tổng hợp

## 8. Bước tiếp theo gợi ý

1. Viết `POST /activities` để tạo dữ liệu test thật trong bảng (hiện đang rỗng), theo cùng pattern `routes/` + `requireAuth` đã có
2. Migrate logic sync Strava từ `strava.js` cũ sang `integrations/strava.js`, dùng Prisma + bảng `oauth_connections` thay vì lưu token rời rạc như code cũ
3. Dựng `modules/index.js` rỗng bên frontend + `Dashboard.jsx` khung, nối vào endpoint `GET /activities` để thấy dữ liệu chạy thật end-to-end trước khi mở rộng
4. Định hình sẵn "interface" chuẩn cho 1 module frontend (key, label, route, DashboardWidget...) ngay từ module fitness, để module coding/blog/books sau này theo đúng khuôn, không phải refactor lại registry

## 9. Ghi chú quan trọng cho lần sau

- **Prisma 7 khác hẳn Prisma 6** ở cách cấu hình kết nối DB — nếu tra cứu tài liệu cũ hoặc hỏi AI mà thấy hướng dẫn có `url` trong `datasource` của `schema.prisma`, đó là hướng dẫn cho bản cũ, không áp dụng được nữa.
- **Luôn dùng generator `prisma-client-js`** (không phải `prisma-client`) cho project JS thuần như `apps/api` — generator mới chỉ hợp với project chạy TypeScript qua `tsx`/`ts-node`.
- Nên **commit `schema.prisma` vào Git** ngay sau khi hoàn thiện, tránh lặp lại sự cố mất nội dung model giữa chừng như đã gặp.
