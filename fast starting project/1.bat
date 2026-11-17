@echo off
title AniDale: server setup
setlocal

rem Папка скрипта -> корень проекта (рядом лежат server и client)
cd /d "%~dp0..\server" || exit /b 1

set /p dep=Install dependencies? y/n:
if /i "%dep%"=="y" (
    echo Installing dependencies...
    call npm i --loglevel error
)

set /p env=Create .env file? y/n:
if /i "%env%"=="y" (
    echo Creating .env...
    call npx vite-node generate-env.ts
)

set /p mig=Apply database migrations? y/n:
if /i "%mig%"=="y" (
    echo Applying migrations...
    call npm run db:migrate
)

echo Generating GraphQL types (watch mode, Ctrl+C to stop)...
call npm run codegen
