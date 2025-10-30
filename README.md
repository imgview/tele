# Telegram Web Client - Vercel Deployment (packed)

Ini adalah paket ZIP berisi struktur project minimal yang Anda minta.

**Isi penting:**
- api/auth/*.js  (send-code / verify-code / verify-password)
- api/messages/*.js (get-dialogs, get-messages, send-message)
- public/ (index.html, app.js, style.css) — frontend placeholder singkat
- package.json, vercel.json, .env

**Catatan:**
- File frontend dibuat sebagai placeholder sederhana (Anda bisa ganti/isi sesuai kebutuhan).
- Session disimpan dengan node-localstorage di folder relative './telegram-sessions' saat dijalankan lokal.
- Jangan lupa set environment variables di Vercel Dashboard (API_ID dan API_HASH) untuk production.
