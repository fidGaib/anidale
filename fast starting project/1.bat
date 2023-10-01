@echo off

title AniDale start developer mode

echo Launching the editor... &echo.
cmd.exe /c start /D "C:\Users\h\AppData\Local\Programs\Microsoft VS Code\" Code.exe

echo Log in to the server folder... &echo.
cd C:\Users\h\Desktop\anidale\anidale\server\

setlocal
set /p input=Install dependencies? y/n:
if %input% == y (
	echo Installing dependencies... &echo.
	CMD /C "C:\Program Files\nodejs\npm" i --loglevel error
) 
echo Create .env file... &echo.
CMD /C "C:\Program Files\nodejs\npx" vite-node generate-env.ts --loglevel error

set /p input2=Migration DataBase? y/n:
if %input2% == y (
	echo Migration DataBase... &echo.
	CMD /C "C:\Program Files\nodejs\npx" prisma migrate dev error
)
echo Generation types for GraphQL... &echo.
npm run codegen
