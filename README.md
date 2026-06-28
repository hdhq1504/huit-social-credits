<div align="center">

# 🎓 HUIT Social Credits

**Hệ thống quản lý điểm công tác xã hội hiện đại, được xây dựng với ReactJS 18, Express 5 và PostgreSQL.**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma%207-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Storage-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)

[Tính năng](#-tính-năng) · [Tech Stack](#-tech-stack) · [Cấu trúc dự án](#-cấu-trúc-dự-án) · [Cài đặt](#-cài-đặt) · [Biến môi trường](#-biến-môi-trường) · [API Reference](#-api-reference)

</div>

---

## ✨ Tính năng

- **👤 Quản lý sinh viên** — Theo dõi thông tin cá nhân, lịch sử tham gia hoạt động và điểm CTXH tích lũy
- **📋 Quản lý hoạt động** — Tạo, chỉnh sửa và quản lý các hoạt động, sự kiện với đầy đủ thông tin chi tiết
- **💬 Phản hồi điểm** — Cho phép sinh viên gửi phản hồi khi có sai sót về điểm, có quy trình xét duyệt rõ ràng
- **🔔 Thông báo nhắc nhở** — Gửi thông báo tự động qua email đến sinh viên chưa đạt đủ điểm
- **🤖 Điểm danh tự động** — Nhận diện khuôn mặt qua webcam bằng face-api.js, không cần điểm danh thủ công
- **📊 Báo cáo & Thống kê** — Xuất báo cáo PDF/Excel và biểu đồ trực quan theo nhiều tiêu chí
- **🏛️ Hội đồng xét điểm** — Thành lập và quản lý hội đồng xét điểm CTXH với phân quyền chi tiết
- **📱 Progressive Web App** — Cài đặt ứng dụng trực tiếp trên thiết bị, hỗ trợ offline cơ bản

---

## 🛠 Tech Stack

### Frontend (`client`)

| Layer | Technology |
|---|---|
| Framework | ReactJS 18 + Vite 7 |
| UI Library | Ant Design 5, Material UI 7 |
| State Management | Zustand (client state), TanStack Query (server state) |
| Styling | SCSS (sass-embedded) |
| Icons | Lucide React, Font Awesome |
| Rich Text | React Quill |
| Face Recognition | face-api.js + React Webcam |
| Charts | Recharts |
| HTTP Client | Axios |
| PWA | vite-plugin-pwa |

### Backend (`server`)

| Layer | Technology |
|---|---|
| Runtime & Framework | Node.js + Express 5 |
| Database | PostgreSQL via Prisma ORM |
| Auth & Storage | Supabase |
| Authentication | JWT (access + refresh token) + bcrypt |
| Security | Helmet, express-rate-limit, sanitize-html |
| Validation | Yup |
| Email | Nodemailer (SMTP) |
| Export | PDFKit (PDF), xlsx (Excel) |
| Testing | Jest + Supertest |

---

## 📁 Cấu trúc dự án

```
HUIT-Social-Credits/
├── client/                      # Source code Frontend
│   └── src/
│       ├── admin/               # Trang & component dành cho Admin
│       ├── api/                 # Định nghĩa các API calls
│       ├── assets/              # Tài nguyên tĩnh (ảnh, icon...)
│       ├── components/          # Component tái sử dụng chung
│       ├── config/              # Cấu hình (Supabase, theme...)
│       ├── context/             # React Context (AuthContext...)
│       ├── hooks/               # Custom React Hooks
│       ├── layouts/             # Layout chính của ứng dụng
│       ├── pages/               # Trang dùng chung
│       ├── routes/              # Cấu hình routing
│       ├── services/            # Service phức tạp (FaceAPI, Upload...)
│       ├── stores/              # State management (Zustand)
│       ├── teacher/             # Trang & component dành cho Giảng viên
│       ├── user/                # Trang & component dành cho Sinh viên
│       └── utils/               # Hàm tiện ích
│
└── server/                      # Source code Backend
    ├── prisma/                  # Schema & migrations
    └── src/
        ├── assets/              # Tài nguyên tĩnh (fonts, templates...)
        ├── controllers/         # Logic xử lý request
        ├── middlewares/         # Middleware (Auth, Upload, Error...)
        ├── routes/              # Định nghĩa API routes
        ├── seed/                # Script tạo dữ liệu mẫu
        ├── tests/               # Unit & integration tests
        ├── utils/               # Hàm tiện ích
        ├── env.js               # Kiểm tra biến môi trường
        └── prisma.js            # Prisma client instance
```

---

## 🚀 Cài đặt

### Yêu cầu

- **Node.js** ≥ 18
- **npm** hoặc **yarn**
- **PostgreSQL** (hoặc dùng Supabase Database)

### 1. Clone & Install

```bash
git clone https://github.com/hdhq1504/HUIT-Social-Credits.git
cd HUIT-Social-Credits
```

```bash
# Frontend
cd client && npm install

# Backend
cd ../server && npm install
```

### 2. Cấu hình biến môi trường

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Xem [Biến môi trường](#-biến-môi-trường) để biết tất cả các giá trị cần thiết.

### 3. Migrate Database

```bash
cd server
npx prisma generate
npx prisma migrate deploy
```

### 4. Khởi chạy

```bash
# Backend — http://localhost:8080
cd server && npm run dev

# Frontend — http://localhost:5173 (terminal mới)
cd client && npm run dev
```

### 5. Chạy Tests (tuỳ chọn)

```bash
cd server
npm run test            # Chạy tất cả tests
npm run test:watch      # Chạy ở chế độ watch
npm run test:coverage   # Chạy với coverage report
```

---

## 🔑 Biến môi trường

### `client/.env`

```env
VITE_API_URL=http://localhost:8080/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### `server/.env`

```env
PORT=8080
DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_PUBLIC_URL=your_supabase_public_url

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

---

## 📡 API Reference

### Sinh viên

| Method | Route | Mô tả |
|---|---|---|
| `GET` | `/api/students` | Lấy danh sách sinh viên |
| `GET` | `/api/students/:id` | Lấy thông tin chi tiết sinh viên |
| `PUT` | `/api/students/:id` | Cập nhật thông tin sinh viên |
| `GET` | `/api/students/:id/credits` | Lấy điểm CTXH của sinh viên |

### Hoạt động

| Method | Route | Mô tả |
|---|---|---|
| `GET` | `/api/activities` | Lấy danh sách hoạt động |
| `POST` | `/api/activities` | Tạo hoạt động mới |
| `PUT` | `/api/activities/:id` | Cập nhật hoạt động |
| `DELETE` | `/api/activities/:id` | Xoá hoạt động |
| `POST` | `/api/activities/:id/attend` | Điểm danh tham gia |

### Phản hồi & Thông báo

| Method | Route | Mô tả |
|---|---|---|
| `POST` | `/api/feedback` | Gửi phản hồi điểm |
| `GET` | `/api/feedback` | Lấy danh sách phản hồi |
| `PUT` | `/api/feedback/:id` | Xét duyệt phản hồi |
| `POST` | `/api/notifications/send` | Gửi thông báo nhắc nhở |

### Báo cáo

| Method | Route | Mô tả |
|---|---|---|
| `GET` | `/api/reports/export/pdf` | Xuất báo cáo PDF |
| `GET` | `/api/reports/export/excel` | Xuất báo cáo Excel |
| `GET` | `/api/reports/stats` | Lấy dữ liệu thống kê |

---

## 🗄 Database Schema

```prisma
model Student {
  id          String       @id @default(cuid())
  studentCode String       @unique
  fullName    String
  email       String       @unique
  class       String
  totalCredit Int          @default(0)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  attendances Attendance[]
  feedbacks   Feedback[]
}

model Activity {
  id          String       @id @default(cuid())
  title       String
  description String?
  credit      Int
  date        DateTime
  location    String?
  maxSlots    Int?
  createdAt   DateTime     @default(now())

  attendances Attendance[]
}

model Attendance {
  id         String   @id @default(cuid())
  studentId  String
  activityId String
  method     String   // "face" | "manual"
  attendedAt DateTime @default(now())

  student    Student  @relation(fields: [studentId], references: [id])
  activity   Activity @relation(fields: [activityId], references: [id])

  @@unique([studentId, activityId])
}

model Feedback {
  id        String   @id @default(cuid())
  studentId String
  message   String
  status    String   @default("pending") // "pending" | "approved" | "rejected"
  createdAt DateTime @default(now())

  student   Student  @relation(fields: [studentId], references: [id])
}
```

---

## 🧩 Các quyết định kiến trúc quan trọng

### Điểm danh bằng nhận diện khuôn mặt
Hệ thống sử dụng `face-api.js` kết hợp với `React Webcam` để nhận diện khuôn mặt trực tiếp trên trình duyệt (client-side inference), không cần gửi ảnh lên server. Kết quả khớp được gửi lên backend để ghi nhận điểm danh cùng với timestamp và phương thức `"face"`.

### Phân quyền ba cấp
Hệ thống phân biệt ba vai trò: **Admin**, **Giảng viên**, và **Sinh viên**. Middleware xác thực JWT kiểm tra `role` trong payload để bảo vệ từng route, đảm bảo mỗi vai trò chỉ truy cập được đúng tài nguyên được phép.

### Xuất báo cáo động
`PDFKit` và `xlsx` được dùng để sinh file báo cáo phía server theo yêu cầu, hỗ trợ lọc theo kỳ học, lớp, hoạt động và khoảng thời gian. File được stream trực tiếp về client mà không lưu tạm trên đĩa.

### Hội đồng xét điểm
Tính năng hội đồng cho phép tạo nhóm xét duyệt gồm nhiều giảng viên. Mỗi trường hợp phản hồi điểm cần đủ số lượng thành viên hội đồng phê duyệt mới được ghi nhận chính thức, đảm bảo tính minh bạch và khách quan.

---

## 📜 Available Scripts

```bash
# Frontend
npm run dev          # Khởi chạy dev server (http://localhost:5173)
npm run build        # Build production
npm run preview      # Preview bản build

# Backend
npm run dev          # Khởi chạy với nodemon
npm run start        # Chạy production
npm run test         # Chạy tất cả tests
npm run test:watch   # Watch mode
npm run test:coverage  # Coverage report

# Database
npx prisma generate        # Generate Prisma client
npx prisma migrate dev     # Tạo & chạy migration mới
npx prisma migrate deploy  # Deploy migrations lên production
npx prisma studio          # Mở Prisma Studio
```

---

## 📄 License

This project is licensed under the MIT License.

<div align="center">
  <sub>Made with ❤️ for HUIT — Trường Đại học Công Thương TP.HCM</sub>
</div>