import asyncio
from app.db.session import async_session_factory
from sqlalchemy import text

FUNC_SQL = """
CREATE OR REPLACE FUNCTION trg_sync_deliverable_usage_counter()
RETURNS TRIGGER AS $func$
DECLARE
    target_client_id UUID;
    deliv_kind deliverable_type;
    actual_used INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_client_id := OLD.client_id;
    ELSE
        target_client_id := NEW.client_id;
    END IF;

    IF target_client_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF (TG_OP != 'DELETE' AND NEW.task_id IS NOT NULL) THEN
        SELECT deliverable_type INTO deliv_kind FROM tasks WHERE id = NEW.task_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.task_id IS NOT NULL) THEN
        SELECT deliverable_type INTO deliv_kind FROM tasks WHERE id = OLD.task_id;
    END IF;

    IF deliv_kind IS NULL THEN
        IF (COALESCE(CASE WHEN TG_OP = 'DELETE' THEN OLD.file_type ELSE NEW.file_type END, '') ILIKE '%video%' 
            OR COALESCE(CASE WHEN TG_OP = 'DELETE' THEN OLD.file_type ELSE NEW.file_type END, '') ILIKE '%mp4%' 
            OR COALESCE(CASE WHEN TG_OP = 'DELETE' THEN OLD.file_type ELSE NEW.file_type END, '') ILIKE '%mov%') THEN
            deliv_kind := 'reel'::deliverable_type;
        ELSIF (COALESCE(CASE WHEN TG_OP = 'DELETE' THEN OLD.file_type ELSE NEW.file_type END, '') ILIKE '%story%') THEN
            deliv_kind := 'carousel'::deliverable_type;
        ELSE
            deliv_kind := 'static_post'::deliverable_type;
        END IF;
    END IF;

    IF deliv_kind = 'story'::deliverable_type THEN
        deliv_kind := 'carousel'::deliverable_type;
    END IF;

    SELECT COUNT(DISTINCT d.root_id) INTO actual_used
    FROM deliverables d
    LEFT JOIN tasks t ON t.id = d.task_id
    WHERE d.client_id = target_client_id
      AND (
          (t.deliverable_type = deliv_kind)
          OR (t.deliverable_type IS NULL AND (
              (deliv_kind = 'reel'::deliverable_type AND (d.file_type ILIKE '%video%' OR d.file_type ILIKE '%mp4%' OR d.file_type ILIKE '%mov%'))
              OR (deliv_kind = 'carousel'::deliverable_type AND d.file_type ILIKE '%story%')
              OR (deliv_kind = 'static_post'::deliverable_type AND NOT (d.file_type ILIKE '%video%' OR d.file_type ILIKE '%mp4%' OR d.file_type ILIKE '%mov%' OR d.file_type ILIKE '%story%'))
          ))
      )
      AND d.status IN ('pending_approval', 'revision_requested', 'approved', 'scheduled', 'publishing', 'published');

    UPDATE usage_counters
       SET used = LEAST(quota, GREATEST(0, actual_used)),
           updated_at = NOW()
     WHERE client_id = target_client_id
       AND (kind = deliv_kind OR (deliv_kind = 'carousel'::deliverable_type AND kind = 'story'::deliverable_type))
       AND period_start <= CURRENT_DATE
       AND period_end >= CURRENT_DATE;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$func$ LANGUAGE plpgsql;
"""

DROP_TRIGGER_SQL = "DROP TRIGGER IF EXISTS trg_sync_deliverables_usage ON deliverables;"

CREATE_TRIGGER_SQL = """
CREATE TRIGGER trg_sync_deliverables_usage
    AFTER INSERT OR UPDATE OF status, client_id, task_id, root_id OR DELETE ON deliverables
    FOR EACH ROW
    EXECUTE FUNCTION trg_sync_deliverable_usage_counter();
"""

RECONCILE_SQL = """
UPDATE usage_counters uc
SET used = LEAST(uc.quota, GREATEST(0, COALESCE(sub.sent_count, 0))),
    updated_at = NOW()
FROM (
    SELECT d.client_id, 
           COALESCE(t.deliverable_type::text, CASE WHEN d.file_type LIKE '%video%' OR d.file_type LIKE '%mp4%' THEN 'reel' WHEN d.file_type LIKE '%story%' THEN 'carousel' ELSE 'static_post' END) as kind,
           COUNT(DISTINCT d.root_id) as sent_count
    FROM deliverables d
    LEFT JOIN tasks t ON t.id = d.task_id
    WHERE d.status IN ('pending_approval', 'revision_requested', 'approved', 'scheduled', 'publishing', 'published')
    GROUP BY d.client_id, kind
) sub
WHERE uc.client_id = sub.client_id
  AND (uc.kind::text = sub.kind OR (sub.kind = 'carousel' AND uc.kind::text = 'story'))
  AND uc.period_start <= CURRENT_DATE
  AND uc.period_end >= CURRENT_DATE;
"""

async def run():
    async with async_session_factory() as db:
        await db.execute(text(FUNC_SQL))
        await db.execute(text(DROP_TRIGGER_SQL))
        await db.execute(text(CREATE_TRIGGER_SQL))
        await db.execute(text(RECONCILE_SQL))
        await db.commit()
        print("Deliverable usage trigger & reconciliation applied successfully!")

if __name__ == "__main__":
    asyncio.run(run())
