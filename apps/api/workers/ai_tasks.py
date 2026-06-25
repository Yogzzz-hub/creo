import logging

logger = logging.getLogger(__name__)

# The canonical generate_ai_analysis task lives in onboarding_tasks.py.
# This module previously had a duplicate definition which was removed.
# Re-export here so that `from workers.ai_tasks import generate_ai_analysis`
# continues to work (used by questionnaires.py).
