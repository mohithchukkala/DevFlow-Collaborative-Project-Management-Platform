# DevFlow — Collaborative Project Management Platform

A full-stack, Jira/Trello-inspired project management platform for software teams.
Built with the **MERN** stack (MongoDB, Express, React, Node) plus **Socket.io**
for real-time collaboration and **Cloudinary** for file uploads.

> No AI features — this is a classic engineering-collaboration app.

## ✨ Features

- **JWT authentication** with role-based access control (Admin / Manager / Developer)
- **Projects** with per-project membership and customizable Kanban columns
- **Kanban board** with drag-and-drop task management (`@hello-pangea/dnd`)
- **Sprint planning** and **milestones** with progress tracking
- **Issue tracking**: tasks, bugs, stories, epics — priority, labels, story points, due dates
- **Real-time collaboration** via Socket.io: live board updates, comments, notifications, activity feed
- **Comments** with `@mention` support
- **File uploads / attachments** (Cloudinary) on tasks + avatars
- **Project documentation** (markdown notes)
- **Activity history** (audit log) per project
- **Advanced search & filtering** on the board (assignee, priority, type, sprint, text)
- **Analytics dashboards** (Recharts): status/priority/type breakdowns, team productivity, completion trend
- **Responsive UI** with a clean custom design system

## 🗂 Project structure

```
cpmp/
├── server/                 # Node + Express + MongoDB API
│   └── src/
│       ├── config/         # db + cloudinary
│       ├── models/         # Mongoose schemas
│       ├── controllers/    # route handlers
│       ├── routes/         # Express routers
│       ├── middleware/     # auth, roles, project access, errors
│       ├── services/       # activity + notification helpers
│       ├── socket/         # Socket.io setup + emit helpers
│       └── utils/          # token, seed
└── client/                 # React (Vite) single-page app
    └── src/
        ├── api/            # axios client
        ├── context/        # Auth, Socket, Toast providers
        ├── components/     # layout, board, shared UI
        ├── pages/          # routed views
        └── utils/          # helpers
```

## 🚀 Getting started

### Prerequisites
- Node.js 18+
- A MongoDB instance (local `mongod` or a MongoDB Atlas URI)
- A Cloudinary account (for uploads) — optional for core features

### 1. Backend

```bash
cd server
npm install
cp .env.example .env        # then fill in your values
npm run seed                # optional: load demo data
npm run dev                 # starts API on http://localhost:5000
```

Configure `server/.env`:

| Variable | Description |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string for signing tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_URL` | Allowed CORS origin, e.g. `http://localhost:5173` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials |

### 2. Frontend

```bash
cd client
npm install
npm run dev                 # starts Vite on http://localhost:5173
```

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:5000`,
so no extra frontend config is needed for local development.

### Demo accounts

After running `npm run seed` (all use password `password123`):

| Role | Email |
|---|---|
| Admin | `admin@devflow.test` |
| Manager | `manager@devflow.test` |
| Developer | `dev1@devflow.test` / `dev2@devflow.test` |

## 🔌 API overview

All routes are prefixed with `/api`. Protected routes require a
`Authorization: Bearer <token>` header.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET/PUT /auth/me` |
| Users | `GET /users`, `GET /users/:id`, `PUT /users/:id/role` *(Admin)*, `DELETE /users/:id` *(Admin)* |
| Projects | `GET/POST /projects`, `GET/PUT/DELETE /projects/:projectId`, member + column management |
| Tasks | `GET/POST /projects/:projectId/tasks`, `GET/PUT/DELETE /tasks/:id`, `PATCH /tasks/:id/move`, attachments |
| Sprints | `GET/POST /projects/:projectId/sprints`, `PUT/DELETE /sprints/:id` |
| Milestones | `GET/POST /projects/:projectId/milestones`, `PUT/DELETE /milestones/:id` |
| Comments | `GET/POST /tasks/:taskId/comments`, `PUT/DELETE /comments/:id` |
| Documents | `GET/POST /projects/:projectId/documents`, `PUT/DELETE /documents/:id` |
| Activity | `GET /projects/:projectId/activity` |
| Analytics | `GET /projects/:projectId/analytics`, `GET /analytics/overview` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Uploads | `POST /uploads` (single file) |

## 🔐 Roles

- **Global account roles**: `Admin`, `Manager`, `Developer`. The first registered
  user becomes Admin. Only Admin/Manager can create projects; only Admin can manage users.
- **Project roles**: each project has an `owner` plus members with `Manager`/`Developer`
  roles. Project Managers/owners manage sprints, milestones, members and columns.

## 📡 Real-time events (Socket.io)

Clients authenticate with their JWT and join `project:<id>` and `user:<id>` rooms.

- `task:created` / `task:updated` / `task:moved` / `task:deleted`
- `comment:added` / `comment:updated` / `comment:deleted`
- `activity:new` — live project activity feed
- `notification:new` — personal notifications

## 🏗 Production build

```bash
cd client && npm run build      # outputs static assets to client/dist
cd server && npm start          # serve the API; host client/dist behind any static server / reverse proxy
```

## 📝 License

MIT
