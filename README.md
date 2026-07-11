# 🚀 Fullstack Application (Web + Mobile)

This project is a **fullstack application** that includes:

* 🌐 **Frontend** – Built with Next.js
* ⚙️ **Backend** – Built with Express.js & MongoDB
* 📱 **Mobile App** – Built with Expo (React Native)

---

## 📁 Project Structure

```
fullstack/
│
├── backend/     # Express + MongoDB API
├── frontend/    # Next.js web app
├── mobile/      # Expo React Native app
└── README.md
```

---

## 🛠️ Prerequisites

Make sure you have installed:

* Node.js (v18 or higher recommended)
* npm or yarn
* MongoDB Atlas account (or local MongoDB)

---

## ⚡ Getting Started

### 1️⃣ Download the Repository


---

### 2️⃣ Setup Environment Variables

Each project contains a `.env.example` file.

👉 **IMPORTANT:**

> When you see a `.env.example` file, **make sure to rename it to `.env`** before running the project.

Example:

```bash
cp .env.example .env
```

---

## 🗄️ MongoDB Setup (Atlas)

1. Go to MongoDB Atlas

2. Create a **free cluster**

3. Create a **database user** (username & password)

4. Go to **Network Access**

   * Add IP Address:

     ```
     0.0.0.0/0
     ```

   👉 This allows access from anywhere (useful for development)

5. Go to **Clusters → Connect → Drivers**

6. Copy your connection string (URI), it looks like:

```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
```

7. Replace values:

   * `<username>` → your DB username
   * `<password>` → your DB password
   * `<dbname>` → your database name

---

### Example `.env` for Backend

```
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mydb
JWT_SECRET=your_secret_key
```

---

## ▶️ Running the Project

### 🔹 Backend (Express)

```bash
cd backend
npm install
npm run dev
```

---

### 🔹 Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

---

### 🔹 Mobile App (Expo)

```bash
cd mobile
npm install
npx expo start
```

* Open Expo Go on your phone OR emulator
* Scan QR code

---

## 🌍 API Connection Notes

* Backend should run on:

  ```
  http://localhost:5000
  ```
* For mobile testing, use your local IP instead of localhost:

  ```
  http://192.168.x.x:5000
  ```

---

## ⚠️ Important Notes

* Never commit `.env` files to GitHub
* Always use `.env.example` for sharing environment structure
* Make sure MongoDB Network Access includes:

  ```
  0.0.0.0/0
  ```

  (for development only — restrict in production)

---

## 📦 Tech Stack

* Frontend: Next.js
* Backend: Express.js, Node.js
* Database: MongoDB
* Mobile: Expo (React Native)

---

## 🙌 Contribution

Feel free to fork and improve this project!

---
