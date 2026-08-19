# Master Dashboard — Setup Log

> Tài liệu ghi lại toàn bộ quá trình dựng khung dự án từ đầu, dùng để đọc lại nắm cấu trúc hoặc build lại từ đầu nếu cần. Cập nhật đến bước: đã tạo Prisma Client + MySQL database, khung React/Express chạy được.

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
│           ├── modules/            # auth, fitness, coding, blog, books
│           ├── integrations/       # strava.js, github.js, wakatime.js
│           ├── core/
│           │   ├── middleware/
│           │   │   └── auth.js
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

`prisma/schema.prisma` — phần khung đầu:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

`.env` ở root:
```
DATABASE_URL="mysql://user:password@localhost:3306/master_dashboard"
```

Sau khi có đầy đủ schema (9 model: `User`, `OAuthConnection`, `Activity`, `CodingLog`, `Goal`, `Post`, `BookReview`, `Tag`, `PostTag` — xem chi tiết ở mục 5), chạy migration đầu tiên:

```bash
npx prisma migrate dev --name init --schema=./prisma/schema.prisma
npx prisma generate --schema=./prisma/schema.prisma
```

✅ **Trạng thái đã xác nhận:** Prisma Client đã generate thành công, MySQL database đã được tạo theo schema.

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

---

## 7. Trạng thái hiện tại

- [x] Repo + npm workspaces
- [x] `apps/web` chạy được (Vite + React + Tailwind v4)
- [x] `apps/api` chạy được (Express, `/api/health` trả `{ok:true}`)
- [x] Prisma schema đầy đủ 9 bảng
- [x] Migration chạy thành công, MySQL database đã tạo
- [x] Prisma Client đã generate
- [ ] Kết nối Prisma Client vào Express (`core/prisma.js`)
- [ ] Module registry rỗng bên frontend (`modules/index.js`)
- [ ] Module fitness đầu tiên (route + migrate dữ liệu từ My Run Log cũ)
- [ ] Module coding, blog, books
- [ ] Trang Dashboard tổng hợp

## 8. Bước tiếp theo gợi ý

1. Viết `apps/api/src/core/prisma.js` — khởi tạo 1 instance `PrismaClient` dùng chung toàn backend
2. Viết module `fitness` đầu tiên: route `GET /activities`, migrate logic từ `activities.js`/`strava.js` cũ sang dùng Prisma Client thay cho `pool.query`
3. Dựng `modules/index.js` rỗng bên frontend + `Dashboard.jsx` khung để bắt đầu ráp UI
