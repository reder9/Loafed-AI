import os
import sys

# Configure standard streams to utf-8 if supported
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print("=======================================================")
    print("[LOAFED AI] The Cat Loaf Inspection Bureau")
    print(f"[LOAFED AI] Server starting at: http://localhost:{port}")
    print("=======================================================")
    uvicorn.run("app:app", host="127.0.0.1", port=port, reload=True)
