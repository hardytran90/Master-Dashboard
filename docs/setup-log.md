# Master Dashboard — Setup Log

> Tài liệu ghi lại toàn bộ quá trình dựng khung dự án từ đầu, dùng để đọc lại nắm cấu trúc hoặc build lại từ đầu nếu cần. Cập nhật đến bước: **module fitness hoàn chỉnh end-to-end** — backend (`POST/GET /activities`, `POST /activities/import-gpx`) và frontend (login, danh sách + form nhập tay + upload GPX, hiển thị real-time) đã test thành công qua Postman và trên UI thật.

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

### 4.7. Route `POST /activities` — tạo dữ liệu test thật

Cùng file `routes/activities.js`, cùng `router`. Nhận `type`, `activityDate`, `distanceKm`, `durationSec`, `elevationGainM` (optional), `source` (mặc định `'manual'`) từ body, validate tối thiểu 4 trường bắt buộc, tạo qua `prisma.activity.create(...)`, gắn `userId` từ `req.user.id`.

**Lưu ý quan trọng về tên field:** field thật trong schema là `distanceKm` (kiểu `Decimal`) và `durationSec` — không phải `distance`/`duration` như bản nháp đầu tiên. Kiểu `Decimal` của Prisma nhận số thường (`5.2`) lúc gửi vào nhưng **trả về dạng string** (`"5.2"`) khi query lại — cần frontend xử lý đúng (không ép `Number()` nếu chỉ để hiển thị).

✅ **Trạng thái đã xác nhận:** tạo được nhiều activity qua Postman (khác `type`, khác ngày), `GET /activities` trả đúng thứ tự `desc`, filter `type`/`from`/`to` và pagination `page`/`limit` đều hoạt động đúng.

### 4.8. Route `POST /activities/import-gpx` — parse file GPX thủ công

**Bối cảnh:** Strava đã giới hạn API activity cho tier miễn phí (bắt trả phí hàng tháng), nên tạm hoãn sync tự động qua OAuth. Hướng thay thế: tải file `.gpx` thủ công từ Strava, upload qua form riêng, backend tự parse ra số liệu.

**Thư viện thêm:**
```bash
npm install multer fast-xml-parser --workspace=apps/api
```

**`apps/api/src/utils/gpx.js`:** dùng `fast-xml-parser` (`XMLParser`) đọc cấu trúc `<gpx><trk><trkseg><trkpt lat lon><ele><time>`, sau đó:
- Tính tổng quãng đường bằng **công thức Haversine** (khoảng cách giữa 2 điểm trên mặt cầu) cộng dồn qua từng cặp điểm liên tiếp
- Tính **elevation gain** bằng cách chỉ cộng phần **tăng** độ cao giữa điểm sau so với điểm trước (bỏ qua phần xuống dốc)
- Tính **duration** = mốc thời gian điểm cuối trừ điểm đầu (`null` nếu file GPX không có tag `<time>`)

**Route trong `routes/activities.js`:** dùng `multer({ storage: memoryStorage() })` để nhận file qua field `'file'` (`multipart/form-data`), đọc buffer thành chuỗi XML, gọi `parseGpx()`, tạo activity với `source: 'gpx'`.

✅ **Trạng thái đã xác nhận:** upload file `.gpx` thật từ Strava qua UI, activity mới xuất hiện với số liệu (`distanceKm`, `durationSec`, `elevationGainM`) chính xác so với thực tế.

### 4.9. Frontend — routing, auth, và UI module fitness

**Cài thêm:**
```bash
npm install react-router-dom --workspace=apps/web
```

**Cấu trúc đã dựng:**
- `lib/api.js` — lớp giao tiếp API duy nhất, hàm `request()` dùng chung tự gắn header `Authorization: Bearer <token>` (đọc từ `localStorage`) và tự nhận diện `body instanceof FormData` để bỏ qua `Content-Type: application/json` khi upload file
- `shared/hooks/useAuth.jsx` — `AuthContext` + `AuthProvider`, quản lý `token`/`isAuthenticated`, expose `login()`/`logout()`
- `features/auth/LoginPage.jsx` — form đăng nhập, gọi `useAuth().login()`
- `features/fitness/ActivityList.jsx` — load + hiển thị activity qua `useEffect` phụ thuộc `refreshKey`
- `features/fitness/ActivityForm.jsx` — form nhập tay, gọi `api.createActivity()`
- `features/fitness/GpxUploadForm.jsx` — chọn file → hiện tên file → bấm nút Upload riêng (tách biệt khỏi bước chọn file) → gọi `api.importGpx()`
- `features/fitness/FitnessPage.jsx` — ráp 3 component trên, dùng state `refreshKey` chung để đồng bộ list mỗi khi tạo/import activity mới
- `App.jsx` — `<Routes>` với `ProtectedRoute` (dựa vào `isAuthenticated`, đá về `/login` nếu chưa đăng nhập)
- `index.css` — định nghĩa toàn bộ style dùng chung qua `@layer components` (`.card`, `.btn-primary`, `.form-input`, `.page-container`...) — **quy tắc bắt buộc:** style luôn viết ở đây, không viết chuỗi Tailwind dài trực tiếp trong từng file `.jsx`, để đồng bộ và dễ sửa toàn dự án từ 1 chỗ

✅ **Trạng thái đã xác nhận:** luồng đầy đủ hoạt động trên UI thật — chưa đăng nhập bị đá về `/login` → đăng nhập đúng vào được trang Fitness → danh sách hiển thị đúng data thật từ MySQL → tạo activity qua form nhập tay và qua upload GPX đều cập nhật danh sách ngay, không cần F5.

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
| `Argument distanceKm is missing` khi `POST /activities` | Route gửi field `distance`/`duration` nhưng schema thật đặt tên cột là `distanceKm`/`durationSec` | Đối chiếu đúng tên field trong `schema.prisma` trước khi viết body request, không đoán tên theo cảm tính |
| Trang `/login` không có style, chỉ hiện chữ thô | `vite.config.js` có `import tailwindcss from '@tailwindcss/vite'` nhưng quên thêm `tailwindcss()` vào mảng `plugins: [react()]` | Thêm đủ `plugins: [react(), tailwindcss()]`, sau đó **bắt buộc tắt và chạy lại `npm run dev`** — Vite không tự nhận thay đổi trong `vite.config.js` khi server đang chạy |
| Bấm nút Login → trang tự F5, không gọi được API | Lỗi JS xảy ra **trước** dòng `e.preventDefault()` kịp chạy (do lỗi bên trong `handleSubmit`), khiến trình duyệt fallback về hành vi submit form mặc định (tải lại trang) | Sửa lỗi gốc bên trong hàm submit; luôn kiểm tra Console trước khi nghi ngờ do thiếu `preventDefault()` |
| `API_BASE is not a function` | Gõ nhầm `...API_BASE(...)` thay vì `...(...)` (spread operator) trong phần `headers` của `lib/api.js` — `API_BASE` chỉ là 1 chuỗi, không phải hàm | Đối chiếu kỹ ký tự khi gõ lại code từ mẫu, đặc biệt các đoạn có spread operator lồng điều kiện `? :` |
| Đăng nhập đúng mật khẩu vẫn báo lỗi 500 | `pool timeout: failed to retrieve a connection from pool` — MySQL server chưa chạy hoặc chưa khởi động lại sau khi máy restart | `brew services start mysql` (hoặc `docker start <container>` nếu dùng Docker), test lại bằng `mysql -u root -p -h 127.0.0.1 -P 3306` trước khi đụng tới Prisma |
| Đăng nhập thành công (token lưu đúng vào `localStorage`) nhưng vẫn bị đá về `/login` | Gõ nhầm `isAUthenticated` (chữ U hoa) trong `AuthContext.Provider value={{...}}`, nhưng nơi dùng lại gọi `isAuthenticated` (u thường) — JavaScript phân biệt hoa/thường nên trả về `undefined`, không báo lỗi gì (sai logic thầm lặng, không phải crash) | Đối chiếu chính xác từng ký tự tên biến khi tên đó được dùng ở nhiều file khác nhau; lỗi loại này không hiện trong Console vì không phải lỗi cú pháp |
| Component `GpxUploadForm` biến mất hoàn toàn khỏi trang, không lỗi Console | Thiếu dấu đóng `}` sau khi kết thúc hàm `handleFileChange`, khiến hàm `handleUpload` và cả đoạn `return (...)` JSX bị lồng nhầm vào bên trong `handleFileChange` — component chính không còn `return` gì ở cấp ngoài cùng | Kiểm tra kỹ số lượng dấu `{ }` đóng/mở khớp nhau, đặc biệt khi có nhiều hàm khai báo liên tiếp trong 1 component |
| Bấm nút Upload không có phản ứng gì (không lỗi, không request, không đổi UI) | `e.target.file` (thiếu chữ `s`) thay vì `e.target.files` — luôn trả `undefined`, khiến `selectedFile` luôn là `null`; `handleUpload` gặp `if (!selectedFile) return;` và dừng ngay dòng đầu, im lặng không báo gì | Khi nút bấm "không có phản ứng gì" dù không disabled, nghi ngờ ngay dòng `return` sớm ở đầu hàm xử lý; có thể tự thêm `console.log()` tạm để kiểm tra giá trị state thực tế |
| `parse is not defined` khi upload GPX | Gõ nhầm `parse.parse(xmlString)` thay vì `parser.parse(xmlString)` — biến khai báo tên là `parser` (từ `new XMLParser(...)`) | Đối chiếu đúng tên biến đã khai báo ở đầu file, đặc biệt khi tên gần giống nhau (`parse` vs `parser`) |
| `max-w-2x1` / `text-x1` không có hiệu lực gì, không báo lỗi | Gõ nhầm số `1` thay vì chữ `l` trong class Tailwind (`2xl`, `xl`) — Tailwind âm thầm bỏ qua class không tồn tại, không crash, không warning | Khi 1 class Tailwind "không có tác dụng gì" dù đã gõ, nghi ngờ ngay lỗi chính tả trong tên class, so sánh trực tiếp với tài liệu Tailwind |

**Nhận xét chung về nhóm lỗi ở bước 4.7–4.9:** phần lớn là lỗi gõ tay khi tự đánh lại code mẫu (nhầm hoa/thường, thiếu 1 ký tự, thiếu dấu đóng ngoặc) — không phải lỗi thiết kế hay logic sai. Cách chẩn đoán hiệu quả nhất đã dùng: kiểm tra theo thứ tự UI → Console → Network → log backend, thu hẹp dần lỗi nằm ở tầng nào trước khi soát lại từng dòng code.

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
- [x] Route `POST /activities` (tạo activity thủ công) — test qua Postman, đủ dữ liệu để kiểm chứng filter/pagination
- [x] Route `POST /activities/import-gpx` (parse GPX, Haversine, elevation gain, duration) — test thành công với file thật từ Strava
- [x] Frontend: routing (`react-router-dom`) + `ProtectedRoute` + `useAuth` (Context/Provider)
- [x] Frontend: `LoginPage`, `ActivityList`, `ActivityForm`, `GpxUploadForm`, `FitnessPage` — hoạt động end-to-end trên UI thật
- [x] Style dùng chung qua `index.css` (`@layer components`) — không viết Tailwind trực tiếp trong từng file page
- [ ] Sync dữ liệu Strava qua OAuth (`integrations/strava.js`, dùng bảng `oauth_connections`) — **code đã viết xong nhưng tạm hoãn test**, vì Strava giới hạn API activity cho tier miễn phí (bắt trả phí hàng tháng); giữ nguyên code, quay lại khi cần hoặc khi có tier phù hợp
- [ ] Filter/pagination UI ở frontend (backend đã hỗ trợ `type`/`from`/`to`/`page`/`limit`, nhưng `ActivityList` hiện gọi `getActivities()` không truyền tham số nào)
- [ ] Nút Logout trên UI (hàm `logout()` đã có sẵn trong `useAuth.jsx`, chưa có nút nào gọi tới)
- [ ] Chọn `type` khi import GPX (hiện mặc định cứng `'run'` ở backend, chưa có input chọn trên `GpxUploadForm`)
- [ ] Module registry rỗng bên frontend (`modules/index.js`)
- [ ] Module coding, blog, books
- [ ] Trang Dashboard tổng hợp

## 8. Bước tiếp theo gợi ý

1. Hoàn thiện các phần còn thiếu nhỏ của module fitness: filter/pagination UI, nút Logout, chọn `type` cho GPX import
2. Dựng `modules/index.js` rỗng bên frontend + định hình "interface" chuẩn cho 1 module (key, label, route, DashboardWidget...) ngay từ module fitness, để module coding/blog/books sau này theo đúng khuôn, không phải refactor lại registry
3. Bắt đầu module thứ 2 (coding hoặc blog) theo đúng khuôn đã định hình
4. Quay lại `integrations/strava.js` khi cần — code đã sẵn sàng, chỉ cần test lại luồng OAuth connect/callback/sync khi có tier API phù hợp

## 9. Ghi chú quan trọng cho lần sau

- **Prisma 7 khác hẳn Prisma 6** ở cách cấu hình kết nối DB — nếu tra cứu tài liệu cũ hoặc hỏi AI mà thấy hướng dẫn có `url` trong `datasource` của `schema.prisma`, đó là hướng dẫn cho bản cũ, không áp dụng được nữa.
- **Luôn dùng generator `prisma-client-js`** (không phải `prisma-client`) cho project JS thuần như `apps/api` — generator mới chỉ hợp với project chạy TypeScript qua `tsx`/`ts-node`.
- Nên **commit `schema.prisma` vào Git** ngay sau khi hoàn thiện, tránh lặp lại sự cố mất nội dung model giữa chừng như đã gặp.
- **Ưu tiên copy-paste trực tiếp từ code mẫu** thay vì gõ lại tay khi triển khai file mới — phần lớn lỗi gặp ở bước 4.7–4.9 (xem mục 6) là lỗi chính tả khi tự đánh lại (nhầm hoa/thường, thiếu ký tự, thiếu dấu đóng ngoặc), không phải lỗi thiết kế.
- **Thứ tự chẩn đoán lỗi hiệu quả đã đúc kết:** kiểm tra UI (có đổi gì không) → Console (F12, lỗi đỏ) → Network (tab Fetch/XHR, có request không, status code gì) → log backend (terminal `nodemon`) — thu hẹp dần lỗi nằm ở tầng nào trước khi soát từng dòng code, tránh đoán mò ngược từ code ra hiện tượng.
- **Quy tắc style bắt buộc cho frontend:** mọi class Tailwind định nghĩa trong `index.css` qua `@layer components`, các file `.jsx` chỉ gọi tên class ngắn (`.card`, `.btn-primary`...) — không viết chuỗi utility dài trực tiếp trong page, để đồng bộ và dễ sửa toàn dự án từ 1 chỗ duy nhất.
