@echo off
title AniDale starting dev mode

echo Open folder... &echo.
cd C:\Users\h\Desktop\anidale\anidale\client\

setlocal
set /p input=Install dependecies? y/n: 
if %input%==y (
echo Installing dependecies... &echo.
CMD /C "C:\Program Files\nodejs\npm" i --loglevel error
)

echo Create types for GraphQL... &echo.
npm run codegen