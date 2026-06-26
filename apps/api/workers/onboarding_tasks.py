"""Onboarding tasks — AI analysis is handled by workers/ai_tasks.py.

This module is retained for import compatibility only.
All Celery tasks have been consolidated into ai_tasks.py to prevent
task-name shadowing (both files previously registered
'name="generate_ai_analysis"').
"""
