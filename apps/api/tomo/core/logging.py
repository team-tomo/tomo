import logging
import sys
from typing import Final

RESET: Final[str] = "\033[0m"

COLORS: Final[dict[str, str]] = {
    "DEBUG": "\033[36m",  # Cyan
    "INFO": "\033[32m",  # Green
    "WARNING": "\033[33m",  # Yellow
    "ERROR": "\033[31m",  # Red
    "CRITICAL": "\033[35m",  # Magenta
}


class ColoredFormatter(logging.Formatter):
    """Prepends ANSI color to the level name in log records."""

    def format(self, record: logging.LogRecord) -> str:
        levelname = record.levelname
        color = COLORS.get(levelname, "")
        record.levelname = f"{color}{levelname}{RESET}"
        try:
            return super().format(record)
        finally:
            record.levelname = levelname


def setup_logging(level: int = logging.INFO) -> None:
    """Configure the root logger with a colored stream handler."""
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    # Root logger filters; handler accepts all levels that reach it.
    handler.setLevel(logging.NOTSET)
    handler.setFormatter(ColoredFormatter("%(levelname)s: %(name)s: %(message)s"))
    root.addHandler(handler)
