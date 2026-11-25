@echo off
setlocal
chcp 65001 >nul 2>&1

:: 1. Installazione silenziosa
start /wait "" "%TEMP%\MannaTecSetup\rustdesk.exe" --silent-install
ping 127.0.0.1 -n 4 >nul

:: 2. Individua eseguibile installato
set "RUSTEXE=%ProgramFiles%\RustDesk\rustdesk.exe"
if not exist "%RUSTEXE%" set "RUSTEXE=%ProgramFiles(x86)%\RustDesk\rustdesk.exe"

:: 3. Applica configurazione server MannaTec
start /wait "" "%RUSTEXE%" --config "host=remote.mannatec.it,relay=remote.mannatec.it:21117,key=xprpBdDVPKwXQd0HBInvLO38hvcT9mkVpBWVFckYkHM="
ping 127.0.0.1 -n 3 >nul

:: 4. Servizio di sistema
start /wait "" "%RUSTEXE%" --install-service
sc start rustdesk >nul 2>&1
ping 127.0.0.1 -n 3 >nul

:: 5. Imposta password fissa Starlink74!
start /wait "" "%RUSTEXE%" --password Starlink74!
ping 127.0.0.1 -n 2 >nul
start /wait "" "%RUSTEXE%" --password Starlink74!
start /wait "" "%RUSTEXE%" --option verification-method use-both-passwords

:: 6. Avvia interfaccia grafica per il cliente
start "" "%RUSTEXE%"
exit /b 0
