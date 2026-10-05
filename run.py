import os
import sys
import logging

# Configure standard streams to utf-8 if supported
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception as err:
        logging.getLogger("loafed.launcher").debug("Could not configure UTF-8 standard streams: %s", err)

import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper(), format="%(asctime)s %(levelname)s %(name)s %(message)s")
    logging.getLogger("loafed.launcher").info("Starting Loafed AI server port=%d", port)
    uvicorn.run("app:app", host="127.0.0.1", port=port, reload=True)
