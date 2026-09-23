"""Progress stream parser for yt-dlp output lines."""

from typing import Optional, Tuple


def format_human_eta(raw_eta: str) -> Optional[str]:
    """Convert yt-dlp ETA string (e.g. '01:25' or '01:10:45') into meaningful human copy ('1m 25s left')."""
    if not raw_eta:
        return None
    cleaned = raw_eta.strip()
    if not cleaned or "unknown" in cleaned.lower() or "na" in cleaned.lower():
        return None

    parts = cleaned.split(":")
    try:
        if len(parts) == 2:
            minutes, seconds = int(parts[0]), int(parts[1])
            if minutes == 0 and seconds == 0:
                return "Almost done"
            if minutes == 0:
                return f"{seconds}s left"
            return f"{minutes}m {seconds:02d}s left"
        elif len(parts) == 3:
            hours, minutes, seconds = int(parts[0]), int(parts[1]), int(parts[2])
            if hours == 0:
                if minutes == 0:
                    return f"{seconds}s left"
                return f"{minutes}m {seconds:02d}s left"
            return f"{hours}h {minutes:02d}m left"
    except ValueError:
        pass

    return f"{cleaned} left"


def format_seconds_remaining(seconds_float: float) -> Optional[str]:
    """Format floating point remaining seconds into human-readable time remaining string."""
    if seconds_float is None or seconds_float < 0:
        return None
    total_sec = int(round(seconds_float))
    if total_sec == 0:
        return "Almost done"
    if total_sec < 60:
        return f"{total_sec}s left"
    hours = total_sec // 3600
    minutes = (total_sec % 3600) // 60
    rem_sec = total_sec % 60
    if hours == 0:
        return f"{minutes}m {rem_sec:02d}s left"
    return f"{hours}h {minutes:02d}m left"


def parse_status_line(line: str) -> Optional[Tuple[float, str, Optional[str]]]:
    """Parse a yt-dlp stdout line containing STATUS|%|speed|eta.

    Returns:
        (percentage, formatted_speed, human_readable_eta) if successfully matched, else None.
    """
    if "STATUS|" not in line:
        return None

    try:
        parts = line[line.find("STATUS|"):].split("|")
        if len(parts) >= 3:
            try:
                pct = float(parts[1].replace("%", "").strip())
            except ValueError:
                pct = 0.0

            raw_spd = parts[2].strip()
            spd = raw_spd.replace("i", "") if raw_spd and "Unknown" not in raw_spd else ""

            raw_eta = parts[3].strip() if len(parts) >= 4 else ""
            eta = format_human_eta(raw_eta)
            return pct, spd, eta
    except Exception:
        pass

    return None

