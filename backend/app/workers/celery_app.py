"""Celery application and beat schedule configuration.

Implements Part VI Phase 6 specifications:
- task_acks_late: True
- task_reject_on_worker_lost: True
- worker_prefetch_multiplier: 1
- time_limit: 900 / soft: 840
- timezone: Asia/Kolkata
- queues: default + publish
- full beat schedule with concurrency isolation
"""

from celery import Celery
from celery.schedules import crontab
from kombu import Exchange, Queue

from app.config import settings

celery_app = Celery(
    "creo",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.tasks.publish",
        "app.workers.tasks.scheduler",
        "app.workers.tasks.notify",
        "app.workers.tasks.maintenance",
    ],
)

default_exchange = Exchange("default", type="direct")
publish_exchange = Exchange("publish", type="direct")

celery_app.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_time_limit=900,
    task_soft_time_limit=840,
    timezone="Asia/Kolkata",
    enable_utc=True,
    broker_connection_retry_on_startup=False,
    broker_connection_max_retries=1,
    task_queues=[
        Queue("default", default_exchange, routing_key="default"),
        Queue("publish", publish_exchange, routing_key="publish"),
    ],
    task_default_queue="default",
    task_default_exchange="default",
    task_default_routing_key="default",
    task_routes={
        "app.workers.tasks.publish.*": {"queue": "publish"},
        "app.workers.tasks.scheduler.*": {"queue": "default"},
        "app.workers.tasks.notify.*": {"queue": "default"},
        "app.workers.tasks.maintenance.*": {"queue": "default"},
    },
)

celery_app.conf.beat_schedule = {
    # Beat publishes query with FOR UPDATE SKIP LOCKED every minute
    "dispatch-due-publishes": {
        "task": "app.workers.tasks.scheduler.dispatch_due_publishes_task",
        "schedule": crontab(minute="*"),  # Every minute
        "options": {"queue": "default"},
    },
    # Idempotent SLA breach monitor every hour
    "check-sla-breaches": {
        "task": "app.workers.tasks.maintenance.sla_breach_sweep_task",
        "schedule": crontab(minute=0),  # Top of every hour
        "options": {"queue": "default"},
    },
    # Concurrent KPI materialized view refresh
    "refresh-mv-exec-kpis": {
        "task": "app.workers.tasks.maintenance.refresh_kpis_task",
        "schedule": crontab(minute="*/15"),  # Every 15 minutes
        "options": {"queue": "default"},
    },
    # Daily proactive long-lived Instagram token refresh at 03:00 IST
    "proactive-ig-token-refresh": {
        "task": "app.workers.tasks.maintenance.refresh_expiring_ig_task",
        "schedule": crontab(hour=3, minute=0),
        "options": {"queue": "default"},
    },
    # Expire stale onboarding deadline hourly
    "expire-stale-onboarding": {
        "task": "app.workers.tasks.maintenance.expire_stale_onboarding_task",
        "schedule": crontab(minute=30),
        "options": {"queue": "default"},
    },
    # Weekly client performance digest every Monday at 08:00 IST
    "weekly-client-digest": {
        "task": "app.workers.tasks.maintenance.weekly_client_reports_task",
        "schedule": crontab(hour=8, minute=0, day_of_week="monday"),
        "options": {"queue": "default"},
    },
    # Nightly rolling 10-day task window assignment at 01:00 IST
    "assign-upcoming-window": {
        "task": "app.workers.tasks.scheduler.assign_upcoming_window_task",
        "schedule": crontab(hour=1, minute=0),
        "options": {"queue": "default"},
    },
    # Nightly operational rebalance sweep at 02:00 IST
    "nightly-rebalance-sweep": {
        "task": "app.workers.tasks.scheduler.rebalance_nightly_sweep_task",
        "schedule": crontab(hour=2, minute=0),
        "options": {"queue": "default"},
    },
}
