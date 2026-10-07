"""Expose only a validated source revision for deployment verification."""

import os
import re


def get_build_revision() -> str | None:
    for key in ("RENDER_GIT_COMMIT", "GIT_COMMIT_SHA"):
        value = os.environ.get(key, "").strip()
        if re.fullmatch(r"[0-9a-fA-F]{40}", value):
            return value.lower()
    return None
