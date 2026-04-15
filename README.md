# Real-Time Academic Debate Platform

Minimal full-stack implementation with:
- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.IO, JWT, bcrypt
- **Frontend:** React (Vite), Axios, Socket.IO Client

## Project Structure

- `backend/` → API, auth, Mongo models, Socket.IO server
- `frontend/` → React UI, Axios API client, Socket.IO client

## 1) Backend Setup

`backend/.env` is already created. Update values if needed:

- `PORT=5001`
- `MONGO_URI=mongodb://127.0.0.1:27017/academic_debate`
- `JWT_SECRET=replace_with_strong_secret`
- `CLIENT_URL=http://localhost:5173`

Run backend:

```bash
cd backend
npm install
npm run dev
```

## 2) Frontend Setup

Run frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and calls backend at `http://localhost:5000`.

## Authentication

- `POST /auth/register`
- `POST /auth/login`

JWT token is stored in `localStorage` and attached automatically in Axios requests.

## Debate APIs

- `GET /debates` (protected)
- `POST /debates` (protected, moderator only)
- `GET /debates/:id` (protected)

## Socket Events

### Client → Server
- `joinDebate` with `debateId`
- `sendArgument` with:
  - `debateId`
  - `content`
  - `type` (`argument | rebuttal | question`)
  - `roundNumber` (optional)

### Server → Client
- `newArgument` (broadcast to debate room)
- `errorMessage` (validation/auth errors)

## Basic Usage Flow

1. Register/Login from frontend.
2. Moderator creates a debate.
3. Users open the same debate room.
4. Users send arguments in real-time.
5. Arguments are persisted in MongoDB and broadcast instantly.
