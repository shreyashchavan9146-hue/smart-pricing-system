import os
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = 8000
FRONTEND_HOST = "127.0.0.1"
FRONTEND_PORT = 3000


def pick_python() -> str:
    venv_python = ROOT / "myenv" / "Scripts" / "python.exe"
    if venv_python.exists():
        return str(venv_python)
    return sys.executable


def port_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex((host, port)) == 0


def ensure_port_free(name: str, host: str, port: int) -> None:
    if port_in_use(host, port):
        raise RuntimeError(
            f"{name} port {port} is already in use on {host}. "
            f"Free that port or change the launcher configuration."
        )


def start_process(label: str, command: list[str], cwd: Path) -> subprocess.Popen:
    creationflags = 0
    if os.name == "nt":
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP

    return subprocess.Popen(
        command,
        cwd=str(cwd),
        creationflags=creationflags,
    )


def stop_process(process: subprocess.Popen) -> None:
    if process.poll() is not None:
        return

    try:
        if os.name == "nt":
            process.send_signal(signal.CTRL_BREAK_EVENT)
            process.wait(timeout=5)
        else:
            process.terminate()
            process.wait(timeout=5)
    except Exception:
        process.kill()


def main() -> int:
    python_exe = pick_python()

    try:
        ensure_port_free("Backend", BACKEND_HOST, BACKEND_PORT)
        ensure_port_free("Frontend", FRONTEND_HOST, FRONTEND_PORT)
    except RuntimeError as exc:
        print(exc, flush=True)
        return 1

    backend_cmd = [
        python_exe,
        "-m",
        "uvicorn",
        "backend.main:app",
        "--host",
        BACKEND_HOST,
        "--port",
        str(BACKEND_PORT),
    ]
    frontend_cmd = [
        python_exe,
        "-m",
        "http.server",
        str(FRONTEND_PORT),
        "--bind",
        FRONTEND_HOST,
    ]

    backend = None
    frontend = None

    try:
        print(f"Using Python: {python_exe}", flush=True)
        print("Starting backend server...", flush=True)
        backend = start_process("backend", backend_cmd, ROOT)
        time.sleep(2)

        if backend.poll() is not None:
            print("Backend failed to start. Check dependencies and MongoDB setup.", flush=True)
            return backend.returncode or 1

        print("Starting frontend server...", flush=True)
        frontend = start_process("frontend", frontend_cmd, ROOT / "frontend")
        time.sleep(1)

        if frontend.poll() is not None:
            print("Frontend failed to start.", flush=True)
            return frontend.returncode or 1

        print("", flush=True)
        print("Project is running.", flush=True)
        print(f"Frontend: http://{FRONTEND_HOST}:{FRONTEND_PORT}", flush=True)
        print(f"Backend:  http://{BACKEND_HOST}:{BACKEND_PORT}", flush=True)
        print("MongoDB should also be running at mongodb://localhost:27017", flush=True)
        print("Press Ctrl+C to stop both servers.", flush=True)

        while True:
            if backend.poll() is not None:
                print("Backend stopped unexpectedly.", flush=True)
                return backend.returncode or 1

            if frontend.poll() is not None:
                print("Frontend stopped unexpectedly.", flush=True)
                return frontend.returncode or 1

            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping project...", flush=True)
        return 0
    finally:
        if frontend is not None:
            stop_process(frontend)
        if backend is not None:
            stop_process(backend)


if __name__ == "__main__":
    raise SystemExit(main())
