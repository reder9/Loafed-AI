@echo off
title Loafed AI - Cat Loaf Grader
echo =======================================================
echo 🍞 LOAFED AI — The Cat Loaf Inspection Bureau
echo Starting server...
echo =======================================================

if exist .venv\Scripts\python.exe (
    .venv\Scripts\python.exe run.py
) else (
    python run.py
)
pause
