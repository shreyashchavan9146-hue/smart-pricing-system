## Smart Pricing System

### Run the whole project with one command

1. Make sure MongoDB is running on `mongodb://localhost:27017`
2. From the project root, run:

```powershell
.\run_project.bat
```

This starts:
- Backend API on `http://127.0.0.1:8000`
- Frontend on `http://127.0.0.1:3000`

If `myenv` exists, the launcher uses `myenv\Scripts\python.exe` automatically.
