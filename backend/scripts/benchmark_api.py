"""Read-only authenticated latency samples. Never persist tokens or response data.

BENCHMARK_EMAIL and BENCHMARK_PASSWORD must be supplied through the environment.
Run: python scripts/benchmark_api.py https://creo-api-singapore.onrender.com --role admin
"""

import argparse
import asyncio
import json
import math
import os
import re
import ssl
import statistics
import time
from pathlib import Path

import httpx

ROUTES = {
    "admin": ["/auth/me", "/notifications", "/admin/performance/runtime", "/admin/kpis",
              "/admin/queue", "/admin/clients", "/admin/calendar", "/admin/leave"],
    "staff": ["/auth/me", "/notifications", "/admin/pod-dashboard", "/admin/calendar", "/admin/leave"],
    "client": ["/auth/me", "/notifications", "/onboarding/status"],
}


async def benchmark(args):
    email, password = os.environ.get("BENCHMARK_EMAIL"), os.environ.get("BENCHMARK_PASSWORD")
    if not email or not password:
        raise SystemExit("Set BENCHMARK_EMAIL and BENCHMARK_PASSWORD; credentials are never written to the report.")
    samples = []
    # Use the system trust store, including Windows enterprise roots.
    async with httpx.AsyncClient(base_url=args.base_url.rstrip('/') + '/api/v1',
                                 verify=ssl.create_default_context(), timeout=45) as client:
        response = await client.post('/auth/login', json={'email': email, 'password': password})
        if response.status_code != 200:
            raise SystemExit(f"Login failed: HTTP {response.status_code}")
        client.headers['Authorization'] = 'Bearer ' + response.json()['access_token']
        concurrency = getattr(args, 'concurrency', 1)
        for route in ROUTES[args.role]:
            async def sample(index):
                start = time.perf_counter()
                try:
                    response = await client.get(route)
                    status = response.status_code
                    timing = response.headers.get('Server-Timing', '')
                except httpx.HTTPError:
                    status, timing = 0, ''
                record = {'path': route, 'phase': 'first' if index == 0 else 'warm',
                          'status': status,
                          'client_ms': round((time.perf_counter() - start) * 1000, 2),
                          'server_timing': timing}
                samples.append(record)
            await sample(0)
            for offset in range(1, args.samples + 1, concurrency):
                start = time.perf_counter()
                await asyncio.gather(*(sample(index) for index in
                    range(offset, min(offset + concurrency, args.samples + 1))))
                # At most five requests/second: bounded production diagnostics,
                # not a stress test that could disrupt other users.
                await asyncio.sleep(max(0, concurrency / 5 - (time.perf_counter() - start)))
    summaries = []
    for route in ROUTES[args.role]:
        warm = [r for r in samples if r['path'] == route and r['phase'] == 'warm']
        values = sorted(r['client_ms'] for r in warm)
        server = sorted(float(match.group(1)) for r in warm
                        if (match := re.search(r'app;dur=([\d.]+)', r['server_timing'])))
        summaries.append({'path': route, 'errors': sum(r['status'] != 200 for r in warm),
                          'client_p50_ms': statistics.median(values),
                          'client_p95_ms': values[math.ceil(len(values) * .95) - 1],
                          'server_p95_ms': server[math.ceil(len(server) * .95) - 1] if server else None,
                          'client_under_100ms': sum(r['client_ms'] < 100 and r['status'] == 200 for r in warm),
                          'server_p95_under_100ms': bool(server) and server[math.ceil(len(server) * .95) - 1] < 100})
    report = {'base_url': args.base_url, 'role': args.role, 'warm_samples_per_route': args.samples,
              'concurrency': concurrency, 'maximum_request_rate': 5,
              'note': 'First samples are not guaranteed cold starts. Bounded diagnostics do not establish maximum capacity or a production SLO guarantee.',
              'summary': summaries, 'samples': samples}
    Path(args.output).write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(summaries, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('base_url')
    parser.add_argument('--role', choices=ROUTES, default='admin')
    parser.add_argument('--samples', type=int, choices=range(3, 51), default=10)
    parser.add_argument('--concurrency', type=int, choices=range(1, 6), default=1)
    parser.add_argument('--output', default='latency-report.json')
    asyncio.run(benchmark(parser.parse_args()))
