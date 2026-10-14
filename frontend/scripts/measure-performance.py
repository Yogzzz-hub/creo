"""Read-only browser timings. Requires Python playwright and its Chromium browser.

Example: python frontend/scripts/measure-performance.py --url http://127.0.0.1:4173 --mobile --throttle --mock-api
"""

import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from playwright.sync_api import sync_playwright


def without_query(url):
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True)
    parser.add_argument("--mobile", action="store_true")
    parser.add_argument("--throttle", action="store_true")
    parser.add_argument("--mock-api", action="store_true", help="Isolate frontend rendering from backend availability")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 390, "height": 844} if args.mobile else {"width": 1440, "height": 1000},
            is_mobile=args.mobile, has_touch=args.mobile, device_scale_factor=1,
        )
        page = context.new_page()
        if args.throttle:
            cdp = context.new_cdp_session(page)
            cdp.send("Network.enable")
            cdp.send("Network.emulateNetworkConditions", {
                "offline": False, "latency": 100,
                "downloadThroughput": 200_000, "uploadThroughput": 100_000,
            })
            cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        if args.mock_api:
            page.route("**/api/**", lambda route: route.fulfill(
                status=200, content_type="application/json",
                body="[]" if urlsplit(route.request.url).path.endswith("/plans")
                else '{"has_enough":false,"items":[]}',
            ))
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.add_init_script("""
            window.__creoPerf = {lcp: 0, blocking: 0};
            new PerformanceObserver(list => {
                for (const entry of list.getEntries()) window.__creoPerf.lcp = entry.startTime;
            }).observe({type: 'largest-contentful-paint', buffered: true});
            new PerformanceObserver(list => {
                for (const entry of list.getEntries()) window.__creoPerf.blocking += Math.max(entry.duration - 50, 0);
            }).observe({type: 'longtask', buffered: true});
        """)
        page.goto(args.url, wait_until="domcontentloaded", timeout=45_000)
        page.wait_for_timeout(10_000)
        data = page.evaluate("""() => ({
            lcp_ms: window.__creoPerf.lcp,
            fcp_ms: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0,
            blocking_ms: window.__creoPerf.blocking,
            resources: performance.getEntriesByType('resource').map(r => ({
                url: r.name, duration_ms: r.duration, decoded_bytes: r.decodedBodySize,
            })),
        })""")
        for resource in data["resources"]:
            resource["url"] = without_query(resource["url"])
        data.update({"url": without_query(args.url), "mobile": args.mobile,
                     "throttled": args.throttle, "mocked_api": args.mock_api, "errors": errors})
        data["javascript_bytes"] = sum(r["decoded_bytes"] for r in data["resources"] if r["url"].endswith(".js"))
        output = json.dumps(data, indent=2)
        if args.output:
            args.output.write_text(output, encoding="utf-8")
        print(output)
        browser.close()


if __name__ == "__main__":
    main()
