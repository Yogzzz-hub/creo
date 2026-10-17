"""Real local API + PostgreSQL + browser journey. No external provider traffic."""

import asyncio
import base64
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright, expect

BASE = "http://127.0.0.1:5181"
ROOT = Path(__file__).resolve().parents[2]
IDS = {
    "bde": "ec000000-0000-0000-0000-000000000002",
    "bde_head": "ec000000-0000-0000-0000-000000000003",
    "admin": "ec000000-0000-0000-0000-000000000004",
}


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        errors = []

        async def session(role, width=1440):
            context = await browser.new_context(viewport={"width": width, "height": 1000})
            token = (
                "mock."
                + base64.urlsafe_b64encode(
                    json.dumps({"exp": 4102444800, "test_role": role}).encode()
                )
                .decode()
                .rstrip("=")
                + ".mock"
            )
            user = {
                "id": IDS[role],
                "role": role,
                "full_name": "Test " + role,
                "email": "test@example.test",
                "account_status": "active",
                "onboarding_stage": 8,
            }
            await context.add_init_script(
                'localStorage.setItem("creo_access_token",'
                + json.dumps(token)
                + ');localStorage.setItem("creo_auth_user",'
                + json.dumps(json.dumps(user))
                + ");"
            )

            async def route(r):
                path = urlparse(r.request.url).path
                if "/api/" not in path:
                    if r.request.url.startswith(BASE):
                        return await r.continue_()
                    return await r.abort()
                if "/crm/" in path or path.endswith("/auth/me"):
                    url = "http://127.0.0.1:8009" + path
                    query = urlparse(r.request.url).query
                    if query:
                        url += "?" + query
                    try:
                        response = await r.fetch(url=url)
                        return await r.fulfill(response=response)
                    except Exception as exc:
                        if "disposed" in str(exc) or "closed" in str(exc):
                            return
                        raise
                return await r.fulfill(json={"items": [], "unread_count": 0, "total": 0})

            await context.route("**/*", route)
            page = await context.new_page()
            page.set_default_timeout(30000)
            page.on("pageerror", lambda e: errors.append(str(e)))
            return context, page

        context, page = await session("bde")
        await page.goto(BASE + "/bde/crm/overview", wait_until="domcontentloaded", timeout=60000)
        await expect(page.get_by_role("heading", name="Action center", exact=True)).to_be_visible(
            timeout=30000
        )
        await page.get_by_role("button", name="New lead", exact=True).click()
        dialog = page.get_by_role("dialog", name="New opportunity")
        company = "Browser Brand " + str(int(time.time()))
        title = "Proposal for " + company
        await dialog.get_by_label("Contact name").fill("Test Buyer")
        await dialog.get_by_label("Company / brand").fill(company)
        await dialog.get_by_label("International phone").fill("+9198" + str(int(time.time()))[-8:])
        await dialog.get_by_label("Expected deal value").fill("25000")
        await dialog.get_by_label("First action").fill("Discuss brand requirements")
        due = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT11:00")
        await dialog.get_by_label("First follow-up").fill(due)
        await dialog.get_by_role("button", name="Save changes").click()
        await expect(dialog).to_have_count(0, timeout=15000)
        await page.goto(BASE + "/bde/crm/leads", wait_until="domcontentloaded", timeout=60000)
        await (
            page.get_by_role("button")
            .filter(has=page.get_by_role("heading", name=company, exact=True))
            .click()
        )
        await page.get_by_role("button", name="Log activity", exact=True).click()
        activity = page.get_by_role("dialog", name="Record a conversation")
        await activity.get_by_label("Interaction type").select_option("call")
        await activity.get_by_label("What was discussed?").fill(
            "Buyer asked for a content proposal."
        )
        await activity.get_by_role("button", name="Save changes").click()
        await expect(activity).to_have_count(0)
        await expect(
            page.get_by_text("Buyer asked for a content proposal.", exact=True)
        ).to_be_visible()
        await page.get_by_role("button", name="Close dialog").click()
        await page.goto(BASE + "/bde/crm/proposals", wait_until="domcontentloaded", timeout=60000)
        await page.get_by_role("button", name="Create proposal", exact=True).click()
        proposal = page.get_by_role("dialog", name="Build a client proposal")
        await proposal.get_by_label("CRM client").select_option(label=company)
        await proposal.get_by_label("Proposal title").fill(title)
        await proposal.get_by_label("Valid until").fill(
            (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%dT18:00")
        )
        await proposal.get_by_label("Service title 1", exact=True).fill("Monthly reels")
        await proposal.get_by_label("Unit price 1", exact=True).fill("10000")
        await proposal.get_by_label("Billing 1", exact=True).select_option("monthly")
        await proposal.get_by_role("button", name="Save & calculate proposal", exact=True).click()
        await expect(proposal).to_have_count(0, timeout=15000)
        await expect(page.get_by_role("heading", name=title)).to_be_visible()
        await expect(page.get_by_role("button", name="Approve version")).to_have_count(0)
        await context.unroute_all(behavior="wait")
        await context.close()

        head_context, head = await session("bde_head")
        await head.goto(BASE + "/bde/crm/proposals")
        await head.get_by_role("button", name="Approve version").last.click()
        await expect(head.get_by_role("button", name="Create client link").last).to_be_visible()
        await head.get_by_role("button", name="Create client link").last.click()
        await expect(head.get_by_role("textbox", name="Secure proposal link")).to_be_visible()
        share = await head.get_by_role("textbox", name="Secure proposal link").input_value()
        public = await head_context.new_page()
        await public.goto(share)
        await expect(public.get_by_role("heading", name=title)).to_be_visible()
        await public.get_by_label("Your full name").fill("Client Buyer")
        await public.get_by_role("button", name="Confirm decision").click()
        await expect(
            public.get_by_text("Your proposal status: accepted.", exact=False)
        ).to_be_visible()
        await head.goto(BASE + "/bde/crm/overview")
        await expect(head.get_by_role("heading", name="BDE team scorecard")).to_be_visible()
        await head.screenshot(path=str(ROOT / ".wrangler/crm-desktop.png"), full_page=True)
        for width in [390, 768]:
            await head.set_viewport_size({"width": width, "height": 900})
            for section in [
                "overview",
                "leads",
                "pipeline",
                "tasks",
                "proposals",
                "referrals",
                "messages",
                "discovery",
                "reports",
                "handoffs",
            ]:
                await head.goto(BASE + "/bde/crm/" + section, wait_until="domcontentloaded", timeout=60000)
                await expect(head.get_by_role("heading", level=1)).to_be_visible()
                await head.wait_for_timeout(200)
                assert await head.evaluate(
                    "document.documentElement.scrollWidth <= window.innerWidth"
                ), (width, section)
                assert not await head.get_by_text(
                    "Error in Admin Operations", exact=False
                ).count(), section
            if width == 390:
                await head.goto(BASE + "/bde/crm/overview")
                await expect(head.get_by_role("heading", name="BDE team scorecard")).to_be_visible()
                await head.screenshot(path=str(ROOT / ".wrangler/crm-mobile.png"), full_page=True)
        await head_context.unroute_all(behavior="wait")
        await head_context.close()
        admin_context, admin = await session("admin")
        await admin.goto(BASE + "/bde/crm/settings")
        await expect(
            admin.get_by_role("heading", name="Agency letterhead & commercial policy")
        ).to_be_visible()
        await expect(admin.get_by_role("button", name="Create CRM account")).to_be_visible()
        await admin.wait_for_load_state("networkidle")
        await admin_context.unroute_all(behavior="wait")
        await admin_context.close()
        assert not errors, errors
        print(
            "PASS: real API lead + task + activity + proposal + head approval + client acceptance; desktop/mobile page coverage and no overflow or browser errors"
        )
        await browser.close()


asyncio.run(main())
