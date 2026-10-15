"""Real HTTP fixture with explicit model substitute; never downloads weights."""
import signal
import sys
from pathlib import Path
from wsgiref.simple_server import make_server

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from main import create_app


def analyzer(text):
    return {"emoji": "\U0001f642", "score": 6, "mood": "Neutral"}


def main():
    with make_server("127.0.0.1", 0, create_app(analyzer)) as server:
        # Raising SystemExit lets the context manager close the listening socket.
        def terminate(signum, frame):
            raise SystemExit(0)
        signal.signal(signal.SIGTERM, terminate)
        signal.signal(signal.SIGINT, terminate)
        print(server.server_port, flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
