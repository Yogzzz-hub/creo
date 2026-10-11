"""Optional UI smoke test: run Vite on 127.0.0.1:4174, then run this file.

Requires Python Playwright and Chromium. Every API call is intercepted; external
network requests are blocked. No account, database or provider is contacted.
"""

import asyncio
import base64
import json
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright, expect

BASE = "http://127.0.0.1:4174"
CLIENT_ID = "00000000-0000-0000-0000-000000000001"
DELIVERABLE_ID = "00000000-0000-0000-0000-000000000002"
USER = {
    "id": CLIENT_ID,
    "email": "client@example.test",
    "full_name": "ABC Restaurant",
    "role": "client",
    "account_status": "active",
    "onboarding_stage": 8,
}


async def main():
    payload = (
        base64.urlsafe_b64encode(json.dumps({"exp": 4102444800}).encode()).decode().rstrip("=")
    )
    token = f"mock.{payload}.mock"
    state = {
        "status": "disconnected",
        "connected": False,
        "configured": True,
        "publishing_enabled": False,
    }
    calls = []
    job = {
        "id": "job-1",
        "client_id": CLIENT_ID,
        "client_name": "ABC Restaurant",
        "deliverable_id": DELIVERABLE_ID,
        "title": "Weekend poster",
        "version": 1,
        "status": "scheduled",
        "caption": "Weekend menu",
        "media_type": "IMAGE",
        "timezone": "Asia/Kolkata",
        "scheduled_at": "2099-10-20T13:00:00Z",
        "approved": True,
        "review_fingerprint": "a" * 64,
        "attempts": 0,
    }

    async def route(request_route):
        request = request_route.request
        parsed = urlparse(request.url)
        path = parsed.path
        if "/api/" not in path:
            if request.url.startswith(BASE):
                return await request_route.continue_()
            return await request_route.abort()
        calls.append((request.method, path))
        if path.endswith("/auth/me"):
            body = USER
        elif "/onboarding/status" in path:
            body = {"stage": 8, "is_complete": True}
        elif "subscription" in path:
            body = {"is_active": True, "subscription": {"status": "active"}}
        elif path.endswith("/portal/profile"):
            body = {**USER, "company_name": "ABC Restaurant"}
        elif path.endswith("/instagram/callback"):
            submitted = request.post_data_json
            assert submitted["verifier"] == "v" * 32 and submitted["state"] == "s" * 32
            body = {
                "selection_id": "selection",
                "accounts": [
                    {"id": "101", "username": "abc_restaurant", "page_name": "Restaurant"},
                    {"id": "102", "username": "other_account", "page_name": "Other"},
                ],
            }
        elif path.endswith("/instagram/select"):
            assert request.post_data_json["account_id"] == "101"
            state.update(
                status="connected",
                connected=True,
                username="abc_restaurant",
                account_id="101",
                page_name="Restaurant",
            )
            body = state
        elif path.endswith("/integrations/instagram"):
            if request.method == "DELETE":
                state.update(status="disconnected", connected=False)
            body = {**state, "provider_revoked": True}
        elif path.endswith("/publishing/jobs"):
            body = [job]
        elif path.endswith(f"/publishing/deliverables/{DELIVERABLE_ID}"):
            body = {
                "job": job,
                "can_manage": False,
                "can_approve": True,
                "approval_status": "approved",
                "file_type": "image/jpeg",
                "connection_status": "connected",
                "account": "abc_restaurant",
            }
        elif "notifications" in path:
            body = {"items": [], "unread_count": 0}
        else:
            body = []
        await request_route.fulfill(
            status=200,
            json=body,
            headers={
                "Access-Control-Allow-Origin": BASE,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Headers": "authorization,content-type",
                "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
            },
        )

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 1000})
        await context.route("**/*", route)
        if hasattr(context, "route_web_socket"):
            await context.route_web_socket("**/*", lambda socket: socket.close())
        await context.add_init_script(
            f"localStorage.setItem('creo_access_token', {json.dumps(token)});"
            f"localStorage.setItem('creo_auth_user', {json.dumps(json.dumps(USER))});"
        )
        page = await context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        await page.goto(BASE + "/portal/account/instagram")
        await expect(
            page.get_by_role("heading", name="Instagram connection", exact=True)
        ).to_be_visible()
        await expect(
            page.get_by_role("button", name="Connect Instagram", exact=True)
        ).to_be_enabled()
        await page.evaluate(
            "sessionStorage.setItem('creo-instagram-oauth', JSON.stringify({"
            f"state: '{'s' * 32}', verifier: '{'v' * 32}', userId: '{CLIENT_ID}'"
            "}))"
        )
        await page.goto(BASE + "/portal/account/instagram?code=mock&state=" + "s" * 32)
        await expect(page.get_by_text("Choose the account for this client")).to_be_visible()
        await page.get_by_role("button", name="@abc_restaurant").click()
        await expect(page.get_by_role("button", name="Reconnect Instagram")).to_be_visible()
        assert "code=" not in page.url
        await page.set_viewport_size({"width": 390, "height": 844})
        await expect(page.get_by_role("button", name="Disconnect", exact=True)).to_be_visible()
        await page.wait_for_function(
            "document.querySelector('aside[aria-label=\"Client navigation\"]')"
            ".getBoundingClientRect().right <= 1"
        )
        assert await page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        output = Path(__file__).resolve().parents[1] / "scratch"
        output.mkdir(exist_ok=True)
        await page.screenshot(path=str(output / "instagram-mobile.png"), full_page=True)
        await page.get_by_role("button", name="Disconnect", exact=True).click()
        await page.get_by_role("button", name="Disconnect", exact=True).last.click()
        await expect(
            page.get_by_role("button", name="Connect Instagram", exact=True)
        ).to_be_visible()
        await page.set_viewport_size({"width": 1440, "height": 1000})
        await page.goto(BASE + "/portal/calendar")
        await expect(page.get_by_text("Production Horizon")).to_be_visible()
        assert await page.get_by_role("heading", name="Instagram publishing queue").count() == 0
        await page.goto(BASE + "/portal/account/instagram")
        await expect(page.get_by_role("heading", name="Instagram publishing queue")).to_be_visible()
        await page.get_by_role("button", name="ABC Restaurant · Weekend poster").click()
        await expect(page.get_by_text("Weekend menu", exact=True)).to_be_visible()
        assert await page.get_by_role("button", name="Edit schedule", exact=True).count() == 0
        assert (
            await page.get_by_role("button", name="Approve this version and caption").count() == 0
        )
        await page.screenshot(path=str(output / "instagram-settings.png"), full_page=True)
        assert not errors, errors
        assert any(method == "DELETE" and path.endswith("/instagram") for method, path in calls)
        await browser.close()
        print(
            "PASS: connection, OAuth selection, disconnect, mobile layout, "
            "read-only settings queue; no real API calls"
        )


if __name__ == "__main__":
    asyncio.run(main())
