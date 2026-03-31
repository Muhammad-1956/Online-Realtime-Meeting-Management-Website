# MeetingDesk — Real-time Meeting Queue Management

A multi-tenant meeting queue system. Each company registers independently and gets a fully isolated workspace.

## Features
- Multi-tenant: each company's data is completely invisible to others
- Two roles: Handler (adds owners) and Manager (accepts / waits / cancels)
- Real-time sync across browser tabs using BroadcastChannel API
- Color-coded status cards (green = accepted, yellow = waiting, red = cancelled)
- No backend required — runs fully in the browser

---

## Deploy to Vercel (3 steps)

### Option A — Vercel CLI
```bash
npm install -g vercel
cd meetingdesk
vercel
```
Follow the prompts. Your site will be live at a `vercel.app` URL.

### Option B — Vercel Dashboard (no CLI)
1. Go to https://vercel.com and sign up / log in
2. Click **"Add New Project"**
3. Choose **"Upload"** and drag the `meetingdesk` folder
4. Click **Deploy** — done!

---

## How to use

### First time — register your company
1. Open the site
2. Click **"Register company"**
3. Enter your company name and choose a secret code
4. Click **"Create Company Account"**

### Daily use
- **Handler**: open the site → sign in with your company name + code → select Handler → Enter Dashboard → add owners via the form
- **Manager**: open the site (different tab or device) → sign in with same company name + code → select Manager → Enter Dashboard → use Accept / Wait / Cancel buttons

### Real-time sync
Open handler and manager in two separate browser tabs — status changes update instantly across both tabs.

---

## Tech stack
- Pure HTML + CSS + JavaScript (no framework, no build step)
- `localStorage` for data persistence per browser
- `BroadcastChannel` API for real-time cross-tab sync
- `vercel.json` for SPA routing

## Upgrading to Angular + .NET
See the architecture notes in the conversation for the full SignalR + JWT multi-tenant backend design.
