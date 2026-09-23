"""Desktop application entry point.

Coordinates environment configuration, backend server lifecycle, and native window launch.
"""

import sys
import threading

from tubemerger.core import settings
from tubemerger.data.banner import BANNER
from tubemerger.desktop.env import setup_desktop_environment
from tubemerger.desktop.server_runner import start_server, wait_for_server
from tubemerger.desktop.window import launch_desktop_window

# Initialize platform-specific desktop environment, stdio redirection, and Windows AppUserModelID
setup_desktop_environment()


def run() -> None:
    """Launch backend service and open native desktop window."""
    print(BANNER)
    print("Starting TubeMerger backend...")

    # Dynamic Port Allocation: Lease an ephemeral kernel port if default 7842 is busy/held
    actual_port = settings.find_available_port(settings.HOST, settings.PORT)
    if actual_port != settings.PORT:
        print(f"Port {settings.PORT} is busy; dynamically bound to port {actual_port}.")
    settings.PORT = actual_port
    settings.SERVER_URL = f"http://{settings.HOST}:{actual_port}"

    server_thread = threading.Thread(target=start_server, args=(actual_port,), daemon=True)
    server_thread.start()

    if not wait_for_server():
        print("Backend failed to start.")
        sys.exit(1)

    print("Backend ready.")
    launch_desktop_window()


if __name__ == "__main__":
    run()
