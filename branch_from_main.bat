@echo off
setlocal EnableExtensions

REM --- go to repo root ---
for /f "delims=" %%R in ('git rev-parse --show-toplevel 2^>nul') do set "REPO_ROOT=%%R"
if "%REPO_ROOT%"=="" (
  echo ERROR: Not inside a git repo. Run inside the repo folder.
  exit /b 1
)
pushd "%REPO_ROOT%" >nul

REM --- ask for new branch name ---
set "BRANCH="
set /p BRANCH=Enter new branch name: 

REM --- trim leading/trailing spaces ---
for /f "tokens=* delims= " %%A in ("%BRANCH%") do set "BRANCH=%%A"

if "%BRANCH%"=="" (
  echo ERROR: Empty branch name.
  popd >nul
  exit /b 1
)

REM --- detect spaces anywhere (reliable) ---
set "NOSPACES=%BRANCH: =%"
if not "%NOSPACES%"=="%BRANCH%" (
  echo ERROR: Branch name must not contain spaces.
  popd >nul
  exit /b 1
)

REM --- validate branch name by git rules ---
git check-ref-format --branch "%BRANCH%" >nul 2>&1
if errorlevel 1 (
  echo ERROR: Invalid branch name "%BRANCH%".
  popd >nul
  exit /b 1
)

REM --- fail if branch already exists locally ---
git show-ref --verify --quiet "refs/heads/%BRANCH%"
if not errorlevel 1 (
  echo ERROR: Local branch "%BRANCH%" already exists.
  popd >nul
  exit /b 1
)

REM --- update origin/main and align local main to it ---
git fetch origin || goto fail
git checkout -B main origin/main || goto fail

REM --- create branch from latest origin/main ---
git checkout -b "%BRANCH%" origin/main || goto fail

REM --- push and set upstream ---
git push -u origin "%BRANCH%" || goto fail

echo.
echo OK: Created and pushed "%BRANCH%" from origin/main
popd >nul
exit /b 0

:fail
echo.
echo ERROR: Git command failed. See the message above.
popd >nul
exit /b 1
