# pyrefly: ignore [missing-import]
from celery import Celery
# pyrefly: ignore [missing-import]
from celery.schedules import crontab

from core.config import settings

celery_app = Celery(
    "creo_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.REDIS_URL,
    include=[
        "workers.ai_tasks",
        "workers.automation_tasks",
        "workers.notification_tasks",
        "workers.onboarding_tasks",
        "workers.report_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    worker_concurrency=4,
    result_expires=3600,
    task_soft_time_limit=300,
    task_time_limit=600,
)

celery_app.conf.beat_schedule = {
    # Reporting tasks
    "generate-weekly-report": {
        "task": "generate_weekly_report",
        "schedule": crontab(hour=8, minute=0, day_of_week="monday"),
        "options": {"queue": "default"},
    },
    "generate-monthly-report": {
        "task": "generate_monthly_report",
        "schedule": crontab(hour=8, minute=0, day_of_month=1),
        "options": {"queue": "default"},
    },
    "generate-financial-report": {
        "task": "generate_financial_report",
        "schedule": crontab(hour=8, minute=0, day_of_month=1),
        "options": {"queue": "default"},
    },
    # Automation tasks
    "check-sla-breaches": {
        "task": "check_sla_breaches",
        "schedule": crontab(minute=0),  # every hour
        "options": {"queue": "default"},
    },
    "auto-assign-tasks": {
        "task": "auto_assign_tasks",
        "schedule": crontab(minute="*/15"),  # every 15 minutes
        "options": {"queue": "default"},
    },
    "send-renewal-reminders": {
        "task": "send_renewal_reminders",
        "schedule": crontab(hour=9, minute=0),  # daily at 09:00
        "options": {"queue": "default"},
    },
    "check-quota-exhaustion": {
        "task": "check_quota_exhaustion",
        "schedule": crontab(hour=10, minute=0),  # daily at 10:00
        "options": {"queue": "default"},
    },
    "generate-content-calendar": {
        "task": "generate_content_calendar",
        "schedule": crontab(hour=2, minute=0, day_of_month=24),  # 24th of every month (7 days before cycle)
        "options": {"queue": "default"},
    },
    "check-content-plan-delivery-sla": {
        "task": "check_content_plan_delivery_sla",
        "schedule": crontab(hour=9, minute=0),  # Daily at 09:00
        "options": {"queue": "default"},
    },
    "check-content-plan-approval-escalation": {
        "task": "check_content_plan_approval_escalation",
        "schedule": crontab(hour=10, minute=0),  # Daily at 10:00
        "options": {"queue": "default"},
    },
    # Sign-up recovery
    "process-abandoned-signups": {
        "task": "process_abandoned_signups",
        "schedule": crontab(minute="*/15"),  # every 15 minutes
        "options": {"queue": "default"},
    },
    # Edge case cleanup
    "cleanup-failed-payments": {
        "task": "cleanup_failed_payments",
        "schedule": crontab(hour=0, minute=0),  # daily at midnight
        "options": {"queue": "default"},
    },
    "proactive-token-refresh": {
        "task": "proactive_token_refresh",
        "schedule": crontab(hour=3, minute=0),  # daily at 03:00
        "options": {"queue": "default"},
    },
}

