@echo off
title Nexa Bot WhatsApp - Local Server
cd /d "%~dp0"
cls
echo ========================================================
echo       NEXA BOT WHATSAPP - LOCAL PC SERVER
echo ========================================================
echo.
echo [1] Bot WhatsApp: AKTIF
echo [2] Web Dashboard: http://localhost:3000
echo.
echo * Catatan: Jangan tutup jendela ini agar bot tetap menyala.
echo * Tekan Ctrl + C jika ingin menghentikan bot.
echo ========================================================
echo.

:loop
node index.js
echo.
echo [WARN] Bot terhenti. Memulai ulang dalam 3 detik...
timeout /t 3 >nul
goto loop
