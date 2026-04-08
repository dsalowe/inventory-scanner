# Inventory Scanner — Setup Guide

## 1. Supabase (database + auth)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a **New Project**
3. Go to **SQL Editor** and paste the contents of `supabase-schema.sql`, then click **Run**
4. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public key**

## 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

## 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 4. Deploy (Vercel — free)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → import your repo
3. Add the two environment variables in Vercel's project settings
4. Deploy — you'll get a public URL usable on any phone

## 5. Use on Mobile

- Open the deployed URL in Safari (iOS) or Chrome (Android)
- Tap **Share → Add to Home Screen** to install as an app
- Grant camera permission when prompted on first scan

## Features

| Feature | Where |
|---|---|
| Scan barcode/QR | Scan tab |
| Manual SKU entry | Scan tab → "Enter SKU manually" |
| Create new item | Auto-prompted when SKU not found |
| Check out (borrower name, contact, qty, due date, notes) | After scanning or from Item Detail |
| Check in | Item Detail → active checkout → Check In |
| View inventory | Inventory tab |
| Transaction history | Item Detail → History |
| Multi-user | All users share the same Supabase database |
