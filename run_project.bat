@echo off
setlocal

if exist "%~dp0myenv\Scripts\python.exe" (
    "%~dp0myenv\Scripts\python.exe" -u "%~dp0run_project.py"
) else (
    python -u "%~dp0run_project.py"
)
