import psycopg2
import sys
sys.path.insert(0, "backend")
from app.core.security import hash_password

def reset_to_fresh():
    conn = psycopg2.connect("postgresql://postgres:postgres@127.0.0.1:5432/creo")
    conn.autocommit = True
    cur = conn.cursor()

    print("Starting database cleanup to remove all mock data...")

    # 1. Truncate operational mock data tables
    tables_to_truncate = [
        "ticket_messages",
        "tickets",
        "content_calendar",
        "deliverables",
        "tasks",
        "payment_events",
        "usage_counters",
        "subscriptions",
        "client_assignments",
        "client_profiles",
        "questionnaires",
        "notifications",
        "refresh_tokens",
        "leave_requests",
        "announcements",
    ]

    for table in tables_to_truncate:
        try:
            cur.execute(f"TRUNCATE TABLE {table} CASCADE;")
            print(f"Truncated operational table: {table}")
        except Exception as e:
            print(f"Notice on {table}: {e}")

    # 2. Delete all client accounts and non-core test accounts
    core_emails = (
        'admin@creo.agency',
        'lead@creo.agency',
        'editor@creo.agency',
        'designer@creo.agency'
    )

    cur.execute("""
        DELETE FROM users
        WHERE email NOT IN %s;
    """, (core_emails,))
    print(f"Purged mock client & test accounts. Retained core agency staff: {core_emails}")

    # 3. Set standard active password Admin123! and must_reset_password = FALSE
    new_hashed_pw = hash_password("Admin123!")
    cur.execute("""
        UPDATE users
        SET hashed_password = %s,
            must_reset_password = FALSE,
            account_status = 'active';
    """, (new_hashed_pw,))
    print("Set password Admin123! for core staff accounts.")

    # 4. Refresh materialized views
    cur.execute("SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';")
    mviews = cur.fetchall()
    for mv in mviews:
        mv_name = mv[0]
        try:
            cur.execute(f"REFRESH MATERIALIZED VIEW {mv_name};")
            print(f"Refreshed materialized view: {mv_name}")
        except Exception as e:
            print(f"Notice on {mv_name}: {e}")

    # 5. Summary verification
    cur.execute("SELECT count(*) FROM users;")
    user_count = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM deliverables;")
    deliv_count = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM subscriptions;")
    sub_count = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM client_profiles;")
    client_count = cur.fetchone()[0]

    print("\n--- CLEAN DATABASE STATUS ---")
    print(f"Clients Count: {client_count}")
    print(f"Deliverables Count: {deliv_count}")
    print(f"Subscriptions Count: {sub_count}")
    print(f"Users Count: {user_count}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    reset_to_fresh()
