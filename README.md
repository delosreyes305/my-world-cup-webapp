# ⚽ My World Cup 2026

The ultimate companion app for FIFA World Cup 2026. Follow every match, team and player in real time — with AI predictions, live news, trivia, email notifications and more.

**Built by [Erick De los Reyes](https://www.linkedin.com/in/erickdelosreyes/) · Miami, FL**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat-square&logo=vercel)](https://your-app.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-delosreyes305-181717?style=flat-square&logo=github)](https://github.com/delosreyes305)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-☕-f0b429?style=flat-square)](https://buymeacoffee.com/delosreyes305)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Required API Keys](#-required-api-keys)
- [Installation & Setup](#-installation--setup)
- [Running the Project](#-running-the-project)
- [Common Commands](#-common-commands)
- [Environment Variables Reference](#-environment-variables-reference)
- [Deployment](#-deployment)

---

## ✨ Features

| Feature | Description |
|---|---|
| ⚽ Live Matches | Real-time match data with statistics |
| 🛡️ Teams | Profiles of all 48 World Cup 2026 teams |
| 👥 Players | Player database with detailed metrics |
| 🏆 Bracket | Live group stage and knockout bracket |
| 📰 News | Real-time World Cup news feed |
| 🌍 FIFA Ranking | Official FIFA world ranking |
| 🧠 Trivia | AI-generated interactive football trivia |
| 🤖 AI Predictor | Claude-powered match outcome predictor |
| ❤️ Favorites | Cloud-synced favorites (teams, players, matches, news) |
| 🔔 Notifications | Email alerts 1h before favorite matches kick off |
| 👤 User Auth | Full auth system: register, login, forgot/reset password |
| ☕ About | Creator page with Buy Me a Coffee support |

---

## 🛠 Tech Stack

**Frontend**
- React 18 + Vite
- React Router DOM
- Context API (Auth, App, Lang)
- Font Awesome icons
- CSS custom properties (dark navy/gold theme)

**Backend**
- Flask (Python)
- Flask-JWT-Extended (authentication)
- Flask-SQLAlchemy + PostgreSQL (Supabase)
- Flask-Bcrypt (password hashing)
- Flask-Mail (password reset emails)
- APScheduler (background jobs)
- Resend (email notifications)

**External APIs**
- API-Sports (football data)
- TheNewsAPI (news feed)
- Anthropic Claude (AI predictor + trivia)

---

## 📁 Project Structure

```
my-world-cup-webapp/
├── src/                        # React frontend
│   ├── assets/img/             # Images (logo, stadium, etc.)
│   ├── components/
│   │   ├── common/             # Reusable components (AuthModal, SearchOverlay, etc.)
│   │   └── layout/             # Layout + Navbar
│   ├── context/                # Global state (Auth, App, Lang)
│   ├── data/                   # Mock/fallback data
│   ├── hooks/                  # Custom hooks (useApi)
│   ├── pages/                  # Page components (Home, Teams, Players, etc.)
│   ├── services/               # API service layer (sports, news, AI)
│   ├── styles/                 # Global CSS
│   ├── App.jsx                 # Routes
│   └── main.jsx                # Entry point
├── backend/                    # Flask backend
│   ├── jobs/                   # Scheduled background jobs
│   │   ├── match_notifier.py   # Sends match alerts 1h before kick-off
│   │   └── news_notifier.py    # Sends news digest to users
│   ├── routes/                 # API endpoints
│   │   ├── auth.py             # /api/auth/* (login, register, profile, etc.)
│   │   ├── favorites.py        # /api/favorites/*
│   │   └── notifications.py    # /api/notifications/*
│   ├── app.py                  # Flask app + scheduler setup
│   ├── models.py               # Database models
│   ├── extensions.py           # Flask extensions (db, bcrypt, mail)
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Backend env template
│   └── .env                    # ⚠️ NOT committed — create manually
├── api/
│   └── claude.js               # Vercel serverless function (Claude proxy)
├── .env.example                # Frontend env template
├── .env                        # ⚠️ NOT committed — create manually
├── vite.config.js              # Vite + dev proxy config
├── vercel.json                 # Vercel deployment config
└── package.json
```

---

## 🔑 Required API Keys

You need **5 API keys** to run the full app. Here's exactly where to get each one:

---

### 1. 🏈 API-Sports (Football Data)
> Powers: Matches, Teams, Players, Live scores, FIFA Ranking

1. Go to → **https://dashboard.api-football.com/register**
2. Create a free account
3. After login, go to **My Subscriptions** → copy your **API Key**
4. Free plan: 100 requests/day

```env
# Frontend .env
VITE_FOOTBALL_API_KEY=your_key_here

# Backend .env (used by notification jobs)
FOOTBALL_API_KEY=your_key_here
```

---

### 2. 📰 TheNewsAPI (News Feed)
> Powers: News page, Home headlines, Email news digests

1. Go to → **https://www.thenewsapi.com/register**
2. Create a free account
3. After confirming your email, go to **Dashboard** → copy your **API Token**
4. Free plan: 100 requests/day, up to 3 articles per request

```env
# Frontend .env
VITE_NEWS_API_KEY=your_token_here

# Backend .env (used by news notifier job)
NEWS_API_KEY=your_token_here
```

---

### 3. 🤖 Anthropic Claude (AI Features)
> Powers: AI Match Predictor, AI Trivia generation

1. Go to → **https://console.anthropic.com/**
2. Sign up / log in
3. Go to **API Keys** → **Create Key** → copy it (starts with `sk-ant-api03-...`)
4. You need credits — add a payment method (starts at ~$5)

```env
# Frontend .env (used by Vite dev proxy)
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your_key_here

# In production (Vercel): set ANTHROPIC_API_KEY in the Vercel dashboard
# (without the VITE_ prefix — it's only used server-side)
```

---

### 4. 📧 Resend (Email Notifications)
> Powers: Match alerts, news digests sent to users

1. Go to → **https://resend.com/signup**
2. Create a free account
3. Go to **API Keys** → **Create API Key** → copy it (starts with `re_...`)
4. Free plan: 100 emails/day, 3,000/month

```env
# Backend .env
RESEND_API_KEY=re_your_key_here
```

---

### 5. 🗄️ Supabase (PostgreSQL Database)
> Powers: User accounts, Favorites, Notification preferences

1. Go to → **https://supabase.com/**
2. Click **Start your project** → create a free account
3. Click **New project** → choose a name and a **strong database password** (save it!)
4. Wait ~2 minutes for the project to be ready
5. Go to **Settings** → **Database** → scroll to **Connection string** → choose **URI**
6. Copy the URI and replace `[YOUR-PASSWORD]` with your actual password

```env
# Backend .env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOURREF.supabase.co:5432/postgres?sslmode=require
```

---

### 6. 🔐 JWT Secret Key
> Used to sign authentication tokens — generate one locally

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

```env
# Backend .env
JWT_SECRET_KEY=paste_the_generated_key_here
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js >= 20
- Python >= 3.9
- Git

---

### 1. Clone the repository

```bash
git clone https://github.com/delosreyes305/my-world-cup-webapp.git
cd my-world-cup-webapp
```

### 2. Frontend setup

```bash
# Install Node dependencies
npm install

# Create frontend environment file
cp .env.example .env
# → Open .env and fill in your API keys
```

### 3. Backend setup

```bash
cd backend

# Create Python virtual environment
python -m venv venv

# Activate it
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows

# Install Python dependencies
pip install -r requirements.txt

# Create backend environment file
cp .env.example .env
# → Open backend/.env and fill in your keys + DATABASE_URL
```

### 4. Database setup

The database tables are created **automatically** on first run — no manual migrations needed. Flask-SQLAlchemy reads your `DATABASE_URL` and creates all tables when the backend starts for the first time.

---

## 🚀 Running the Project

You need **two terminals** running simultaneously:

### Terminal 1 — Frontend (React + Vite)

```bash
# From the project root
npm run dev
```

→ Opens at **http://localhost:3000**

---

### Terminal 2 — Backend (Flask)

```bash
cd backend
source venv/bin/activate    # macOS/Linux
python app.py
```

→ Runs at **http://localhost:5000**

---

## 💻 Common Commands

### Frontend

| Command | Description |
|---|---|
| `npm install` | Install / update Node dependencies |
| `npm run dev` | Start dev server with hot reload (port 3000) |
| `npm run build` | Build for production (outputs to `/dist`) |
| `npm run preview` | Preview the production build locally |

---

### Backend

| Command | Description |
|---|---|
| `source venv/bin/activate` | Activate Python virtual environment (macOS/Linux) |
| `venv\Scripts\activate` | Activate Python virtual environment (Windows) |
| `deactivate` | Deactivate virtual environment |
| `pip install -r requirements.txt` | Install Python dependencies |
| `pip freeze > requirements.txt` | Save current packages to requirements.txt |
| `python app.py` | Start Flask server (port 5000) |

---

### 🔄 Restart Flask Server

If the server crashes or you changed backend code:

```bash
# Step 1: Find and kill the process on port 5000
lsof -ti:5000 | xargs kill -9

# Step 2: Start it again (make sure venv is active)
cd backend
source venv/bin/activate
python app.py
```

Or in one line:
```bash
lsof -ti:5000 | xargs kill -9 && cd backend && source venv/bin/activate && python app.py
```

> **Windows alternative:** `netstat -ano | findstr :5000` → find the PID → `taskkill /PID <pid> /F`

---

### 🛑 Kill frontend dev server

```bash
# Kill whatever is running on port 3000
lsof -ti:3000 | xargs kill -9
```

---

### 🐍 Python / pip

```bash
# Generate a secure random JWT secret key
python -c "import secrets; print(secrets.token_hex(32))"

# Check installed packages
pip list

# Add a new package and save it
pip install <package-name>
pip freeze > requirements.txt
```

---

### 🗄️ Database

```bash
# The tables are auto-created on first Flask run.
# If you need to reset the database completely:
# 1. Go to Supabase → Table Editor → delete the tables manually
# 2. Restart Flask — it will recreate them fresh
```

---

## 📄 Environment Variables Reference

### Frontend — `.env` (root folder)

```env
VITE_FOOTBALL_API_KEY=        # API-Sports key
VITE_FOOTBALL_BASE_URL=https://v3.football.api-sports.io

VITE_NEWS_API_KEY=            # TheNewsAPI token
VITE_NEWS_BASE_URL=https://api.thenewsapi.com/v1

VITE_ANTHROPIC_API_KEY=       # Anthropic Claude key (dev only)
```

### Backend — `backend/.env`

```env
# Database
DATABASE_URL=                 # Supabase PostgreSQL URI

# Auth
JWT_SECRET_KEY=               # Random 64-char hex string

# Email (password reset via Flask-Mail)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=                # Your Gmail address
MAIL_PASSWORD=                # Gmail App Password (not your real password)
MAIL_DEFAULT_SENDER=          # Same as MAIL_USERNAME
FRONTEND_URL=http://localhost:3000

# Email notifications (Resend)
RESEND_API_KEY=               # Resend API key

# For background notification jobs
NEWS_API_KEY=                 # TheNewsAPI token (same as frontend)
FOOTBALL_API_KEY=             # API-Sports key (same as frontend)

# Flask
FLASK_ENV=development
FLASK_PORT=5000
```

> ⚠️ **Never commit `.env` files.** They are in `.gitignore` by default.

---

### Setting up Gmail App Password (for password reset emails)

1. Go to → **https://myaccount.google.com/security**
2. Enable **2-Step Verification** (required)
3. Go back to Security → **App Passwords**
4. Select app: **Mail** / device: **Other** → type any name
5. Copy the 16-character password (no spaces) → paste into `MAIL_PASSWORD`

---

## 🌐 Deployment

### Vercel (Frontend + Claude API function)

1. Go to → **https://vercel.com/** → Import your GitHub repo
2. Set **Framework Preset** to `Vite`
3. Add all `VITE_*` environment variables in the Vercel dashboard
4. Add `ANTHROPIC_API_KEY` (without `VITE_` prefix) for the serverless function
5. Deploy — Vercel handles the rest automatically

### Backend (Flask)

The Flask backend can be deployed to:
- **Railway** → https://railway.app (easiest, free tier)
- **Render** → https://render.com (free tier, sleeps after inactivity)
- **Fly.io** → https://fly.io (free tier, more control)

Set all `backend/.env` variables in your chosen platform's dashboard.

---

## 👤 Author

**Erick De los Reyes**
- 🌐 [LinkedIn](https://www.linkedin.com/in/erickdelosreyes/)
- 💻 [GitHub](https://github.com/delosreyes305)
- ☕ [Buy me a coffee](https://buymeacoffee.com/delosreyes305)

---

*Not affiliated with FIFA. Built with ❤️ for football fans around the world.*
