import psycopg2

def reset_to_fresh():
    conn = psycopg2.connect("postgresql://postgres:postgres@127.0.0.1:5432/creo")
    conn.autocommit = True
    cur = conn.cursor()

    print("Starting fresh database cleanup...")

    # 1. Truncate operational mock data
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
    ]

    for table in tables_to_truncate:
        try:
            cur.execute(f"TRUNCATE TABLE {table} CASCADE;")
            print(f"Truncated: {table}")
        except Exception as e:
            print(f"Notice on {table}: {e}")

    # 2. Delete all client accounts and any non-core test staff accounts
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
    print(f"Purged all mock client and test accounts. Kept only core staff: {core_emails}")

    # 3. Ensure ALL remaining users have must_reset_password = TRUE
    cur.execute("""
        UPDATE users
        SET must_reset_password = TRUE;
    """)
    print("Set must_reset_password = TRUE for all remaining users.")

    # 4. Refresh materialized views if any
    cur.execute("SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';")
    mviews = cur.fetchall()
    for mv in mviews:
        mv_name = mv[0]
        try:
            cur.execute(f"REFRESH MATERIALIZED VIEW {mv_name};")
            print(f"Refreshed materialized view: {mv_name}")
        except Exception as e:
            print(f"Notice on {mv_name}: {e}")

    # 5. Verification summary
    cur.execute("SELECT count(*) FROM users;")
    user_count = cur.fetchone()[0]
    cur.execute("SELECT email, role, must_reset_password FROM users;")
    remaining_users = cur.fetchall()

    cur.execute("SELECT count(*) FROM deliverables;")
    deliv_count = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM subscriptions;")
    sub_count = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM client_profiles;")
    client_count = cur.fetchone()[0]

    print("\n--- FRESH DATABASE STATUS ---")
    print(f"Clients Count: {client_count} (Fresh start: 0 clients)")
    print(f"Deliverables Count: {deliv_count} (Fresh start: 0 deliverables)")
    print(f"Subscriptions Count: {sub_count} (Fresh start: 0 income / subscriptions)")
    print(f"Users Count: {user_count}")
    print("Users List:")
    for u in remaining_users:
        print(f"  - {u[0]} ({u[1]}): must_reset_password = {u[2]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    reset_to_fresh()
