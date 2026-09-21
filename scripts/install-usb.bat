@echo off
REM ==========================================================
REM NANTOR SOURCING APP — INSTALLATION USB DEBUGGING (WINDOWS)
REM ==========================================================
title Nantor Sourcing App - Installation USB Android

echo =========================================================
echo    NANTOR SOURCING APP : INSTALLATION VIA DEBOGAGE USB
echo =========================================================
echo.

where adb >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] ADB (Android Debug Bridge) n'est pas installe ou non present dans le PATH.
    echo Telechargez les outils Android Platform-Tools :
    echo https://developer.android.com/tools/releases/platform-tools
    pause
    exit /b 1
)

echo [1/4] Recherche du smartphone connecte en USB...
adb devices
echo.

echo Assurez-vous que votre telephone affiche 'device' et non 'unauthorized'.
echo Validez l'autorisation 'Autoriser le debogage USB' sur l'ecran du telephone si demande.
echo.
pause

echo [2/4] Compilation des assets...
call npm run build
if %errorlevel% neq 0 (
    echo Erreur lors du build.
    pause
    exit /b 1
)

echo [3/4] Synchronisation Capacitor Android...
call npx cap sync android

echo [4/4] Compilation et installation sur votre telephone via USB...
call npx cap run android

echo.
echo =========================================================
echo    APPLICATION INSTALLEE AVEC SUCCES SUR VOTRE SMARTPHONE
echo =========================================================
pause
