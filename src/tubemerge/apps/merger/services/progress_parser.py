"""Progress stream parser for yt-dlp output lines."""

from typing import Optional, Tuple


def parse_status_line(line: str) -> Optional[Tuple[float, str]]:
    """Parse a yt-dlp stdout line containing STATUS|%|speed|eta.

    Returns:
        (percentage, formatted_speed) if successfully matched, else None.
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
            return pct, spd
    except Exception:
        pass

    return None
