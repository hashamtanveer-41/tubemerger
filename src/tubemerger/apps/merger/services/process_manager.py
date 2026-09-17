"""Cross-platform subprocess lifecycle supervisor for merger pipelines.

Manages process registration, signal handlers, atexit cleanup, and process tree
suspension/resumption across POSIX and Windows.
"""

import atexit
import logging
import os
import signal
import subprocess
import sys
import threading
from typing import List, Optional

logger = logging.getLogger(__name__)

# Global registry of running subprocesses to guarantee cleanup on exit/crash
_ACTIVE_PROCS: List[subprocess.Popen] = []
_REGISTRY_LOCK = threading.Lock()


def register_process(proc: subprocess.Popen) -> None:
    """Register an active subprocess in the global guard registry."""
    with _REGISTRY_LOCK:
        _ACTIVE_PROCS.append(proc)


def deregister_process(proc: subprocess.Popen) -> None:
    """Remove a finished or terminated subprocess from the registry."""
    with _REGISTRY_LOCK:
        try:
            _ACTIVE_PROCS.remove(proc)
        except ValueError:
            pass


def get_active_process_registry() -> List[subprocess.Popen]:
    """Get reference to the shared process registry."""
    return _ACTIVE_PROCS


def kill_all_active_processes() -> None:
    """Force-kill every registered subprocess. Called on app exit or crash."""
    with _REGISTRY_LOCK:
        for proc in list(_ACTIVE_PROCS):
            try:
                if proc.poll() is None:
                    logger.warning("Sending SIGKILL to PID %s on exit.", proc.pid)
                    proc.kill()
            except Exception as exc:
                logger.debug("Kill failed for proc: %s", exc)
        _ACTIVE_PROCS.clear()


def _signal_handler(signum, frame) -> None:
    kill_all_active_processes()


# Register cleanup handlers on process exit and common termination signals
atexit.register(kill_all_active_processes)
for _sig in (signal.SIGTERM, signal.SIGINT):
    try:
        signal.signal(_sig, _signal_handler)
    except (OSError, ValueError):
        pass  # Some signals can't be registered in worker/non-main threads


def suspend_proc_tree(proc: Optional[subprocess.Popen]) -> None:
    """Suspend execution of a process and all its children across platforms."""
    if not proc or proc.poll() is not None:
        return
    try:
        import psutil
        p = psutil.Process(proc.pid)
        for child in p.children(recursive=True):
            try:
                child.suspend()
            except Exception:
                pass
        p.suspend()
    except Exception:
        try:
            if sys.platform != "win32":
                os.kill(proc.pid, signal.SIGSTOP)
        except Exception:
            pass


def resume_proc_tree(proc: Optional[subprocess.Popen]) -> None:
    """Resume execution of a suspended process and all its children."""
    if not proc or proc.poll() is not None:
        return
    try:
        import psutil
        p = psutil.Process(proc.pid)
        p.resume()
        for child in p.children(recursive=True):
            try:
                child.resume()
            except Exception:
                pass
    except Exception:
        try:
            if sys.platform != "win32":
                os.kill(proc.pid, signal.SIGCONT)
        except Exception:
            pass
