@echo off

title AniDale start developer mode



setlocal
set /p vs=Launching the editor? y/n:
if %vs% == y (
	echo Launching the editor... &echo.
	cmd.exe /c start /D "C:\Users\h\AppData\Local\Programs\Microsoft VS Code\" Code.exe
) 

echo Log in to the server folder... &echo.
cd C:\Users\h\Desktop\anidale\anidale\server\

set /p dep=Install dependencies? y/n:
if %dep% == y (
	echo Installing dependencies... &echo.
	CMD /C "C:\Program Files\nodejs\npm" i --loglevel error
) 
set /p env=Create .env file? y/n:
if %env% == y (
	echo Create .env file... &echo.
	CMD /C "C:\Program Files\nodejs\npx" vite-node generate-env.ts --loglevel error
) 
set /p mig=Migration DataBase? y/n:
if %mig% == y (
	echo Migration DataBase... &echo.
	CMD /C "C:\Program Files\nodejs\npx" prisma migrate dev error
)
echo Generation types for GraphQL... &echo.
npm run codegen
