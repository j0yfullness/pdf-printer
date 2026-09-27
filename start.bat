@echo off
rem ============================================================
rem  pdf-printer - jalankan server statis + buka browser
rem  Butuh Python (disarankan) atau Node.js sebagai cadangan.
rem  Tutup jendela ini untuk mematikan server.
rem ============================================================
setlocal EnableExtensions
cd /d "%~dp0"

set "PORT=8777"
set "URL=http://127.0.0.1:%PORT%/"

rem --- cari Python ---
set "PY="
where py >nul 2>nul
if not errorlevel 1 set "PY=py"
if not defined PY (
    where python >nul 2>nul
    if not errorlevel 1 set "PY=python"
)

rem --- cadangan: Node.js lewat npx ---
set "NODE="
if not defined PY (
    where node >nul 2>nul
    if not errorlevel 1 set "NODE=1"
)

if not defined PY if not defined NODE (
    echo.
    echo   GAGAL: Python atau Node.js tidak ditemukan di PATH.
    echo   Pasang Python ^(https://www.python.org^) lalu jalankan lagi.
    echo.
    pause
    exit /b 1
)

echo.
echo   PDF Printer
echo   Server : %URL%
echo   Hentikan: tutup jendela ini ^(Ctrl+C^)
echo.

rem --- buka browser setelah server siap ---
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process '%URL%'"

if defined PY (
    %PY% -m http.server %PORT% --bind 127.0.0.1
) else (
    call npx --yes http-server -p %PORT% -a 127.0.0.1 -c-1
)

echo.
echo   Server berhenti.
pause
