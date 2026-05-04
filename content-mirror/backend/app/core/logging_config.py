import json
import logging
import time

# Fields that are internal LogRecord bookkeeping — not included in JSON output
_SKIP = frozenset({
    "args", "created", "exc_info", "exc_text", "filename", "funcName",
    "levelno", "lineno", "message", "module", "msecs", "msg", "name",
    "pathname", "process", "processName", "relativeCreated", "stack_info",
    "thread", "threadName", "taskName",
})


class JSONFormatter(logging.Formatter):
    """Emit one JSON object per log line for structured log aggregation."""

    def format(self, record: logging.LogRecord) -> str:
        record.message = record.getMessage()
        out: dict = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.message,
        }
        # Capture any extra= fields passed to the logger call
        for key, val in record.__dict__.items():
            if key not in _SKIP and not key.startswith("_"):
                out[key] = val
        if record.exc_info:
            out["exc"] = self.formatException(record.exc_info)
        return json.dumps(out, default=str)
