"""create_auth_sync_trigger

Revision ID: 025
Revises: 024
Create Date: 2026-06-24

"""
from alembic import op


revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None

SYNC_FUNCTION = """
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (
        auth_id,
        email,
        full_name,
        role,
        account_status
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'client')::user_role,
        'pending_verification'::account_status
    )
    ON CONFLICT (auth_id) DO NOTHING;
    RETURN NEW;
END;
$$;
"""

DROP_SYNC_FUNCTION = "DROP FUNCTION IF EXISTS public.handle_new_user();"

CREATE_TRIGGER = """
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
"""

DROP_TRIGGER = "DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;"


def upgrade() -> None:
    op.execute(SYNC_FUNCTION)
    op.execute(CREATE_TRIGGER)


def downgrade() -> None:
    op.execute(DROP_TRIGGER)
    op.execute(DROP_SYNC_FUNCTION)
