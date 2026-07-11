# Online Leave Management System

For KDUSC

A web application for managing student leave requests, approvals, and gate movement tracking.

* 🌐 **Frontend** – Next.js (React)
* ⚙️ **Backend** – Express.js (Node) & MongoDB

---

## 📁 Project Structure

```
online leave/
├── backend/     # Express + MongoDB API
├── frontend/    # Next.js web app
└── README.md
```

---

## ⚡ Getting Started

```bash
git clone https://github.com/Dk0617/Online-Leave-Management-System.git
cd Online-Leave-Management-System
```

Copy `.env.example` to `.env` in `backend/` and fill in your MongoDB URI and JWT secret, then:

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.
