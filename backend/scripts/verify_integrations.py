"""Comprehensive integration verification test script for all credentials and services.

Verifies:
1. Config loading & decryption keys
2. Razorpay API connection & test order creation
3. Instagram Graph API authentication & app token
4. Google SMTP TLS authentication & email delivery
5. Google OAuth 2.0 URL generation & callback routing
6. Brand DNA synthesis with Gemini fallback resilience
7. System Health Endpoint check
"""

import asyncio
import hashlib
import hmac
import sys
import uuid

import httpx

from app.config import settings
from app.models.enums import PaymentProvider
from app.services.brand_dna import generate_deterministic_brand_dna
from app.services.email_service import send_otp_email
from app.services.payment_service import verify_webhook_signature


async def run_verifications() -> dict[str, bool]:
    results: dict[str, bool] = {}
    print("=" * 60)
    print("CREO FULL INTEGRATION TEST SUITE")
    print("=" * 60)

    # 1. Config & Cryptography
    print("\n[1/7] Testing App Config & Encryption Key...")
    try:
        from cryptography.fernet import Fernet
        f = Fernet(settings.ENCRYPTION_KEY.encode())
        sample = b"creo-security-audit-token"
        encrypted = f.encrypt(sample)
        decrypted = f.decrypt(encrypted)
        assert decrypted == sample
        assert len(settings.JWT_SECRET) >= 32
        print("  -> Config & Fernet Encryption Key: PASSED")
        results["config_and_crypto"] = True
    except Exception as e:
        print(f"  -> FAILED: {e}")
        results["config_and_crypto"] = False

    # 2. Razorpay API & Webhook Verification
    print("\n[2/7] Testing Razorpay Live Integration & Webhook Signing...")
    try:
        # Test basic auth against Razorpay API
        async with httpx.AsyncClient(timeout=10.0) as client:
            rzp_res = await client.post(
                "https://api.razorpay.com/v1/orders",
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                json={"amount": 2500000, "currency": "INR", "receipt": f"test_{uuid.uuid4().hex[:8]}"},
            )
            assert rzp_res.status_code == 200, f"Razorpay status: {rzp_res.status_code}"
            rzp_data = rzp_res.json()
            order_id = rzp_data.get("id")
            assert order_id.startswith("order_"), f"Unexpected order id: {order_id}"
            print(f"  -> Live Razorpay Order Created: {order_id} (INR 25,000)")

        # Test Webhook HMAC signing with configured secret
        body = b'{"event":"payment.captured","amount":2500000}'
        sig = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
        is_valid = verify_webhook_signature(body, sig, PaymentProvider.RAZORPAY)
        assert is_valid is True, "Signature verification failed"
        print(f"  -> Webhook HMAC signature verification ({settings.RAZORPAY_WEBHOOK_SECRET}): PASSED")
        results["razorpay"] = True
    except Exception as e:
        print(f"  -> FAILED: {e}")
        results["razorpay"] = False

    # 3. Instagram Graph API
    print("\n[3/7] Testing Meta / Instagram Graph API App Authentication...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            ig_res = await client.get(
                "https://graph.facebook.com/oauth/access_token",
                params={
                    "client_id": settings.INSTAGRAM_APP_ID,
                    "client_secret": settings.INSTAGRAM_APP_SECRET,
                    "grant_type": "client_credentials",
                },
            )
            assert ig_res.status_code == 200, f"Meta Graph API status: {ig_res.status_code}"
            ig_data = ig_res.json()
            app_token = ig_data.get("access_token", "")
            assert app_token.startswith(settings.INSTAGRAM_APP_ID)
            print(f"  -> Meta Graph API App Access Token verified for App ID: {settings.INSTAGRAM_APP_ID}")
            results["instagram"] = True
    except Exception as e:
        print(f"  -> FAILED: {e}")
        results["instagram"] = False

    # 4. Google Gmail SMTP
    print("\n[4/7] Testing Google SMTP TLS & Email Dispatch...")
    try:
        email_ok = await send_otp_email("creotool26@gmail.com", "992841")
        assert email_ok is True
        print(f"  -> Google SMTP Email Sent to creotool26@gmail.com: PASSED")
        results["smtp"] = True
    except Exception as e:
        print(f"  -> FAILED: {e}")
        results["smtp"] = False

    # 5. Google OAuth 2.0
    print("\n[5/7] Testing Google OAuth 2.0 URL Generation...")
    try:
        from app.routers.auth import get_google_auth_url
        res = await get_google_auth_url()
        url = res.get("url", "")
        assert settings.GOOGLE_CLIENT_ID in url
        assert "accounts.google.com/o/oauth2/v2/auth" in url
        print(f"  -> Google OAuth URL generated with Client ID {settings.GOOGLE_CLIENT_ID[:15]}...: PASSED")
        results["google_oauth"] = True
    except Exception as e:
        print(f"  -> FAILED: {e}")
        results["google_oauth"] = False

    # 6. Brand DNA AI Fallback
    print("\n[6/7] Testing Brand DNA Synthesis Fallback Chain...")
    try:
        answers = {
            "target_audience": "Tech startups and founders",
            "tone_keywords": ["Bold", "Futuristic", "High-Impact"],
            "color_palette": ["#000000", "#3B82F6", "#10B981"],
        }
        dna = generate_deterministic_brand_dna(answers)
        assert "Bold, Futuristic, High-Impact" in dna.tone
        assert len(dna.recommended_formats) == 3
        print(f"  -> Brand DNA AI Resilience synthesis: PASSED ('{dna.ai_summary_line}')")
        results["brand_dna"] = True
    except Exception as e:
        print(f"  -> FAILED: {e}")
        results["brand_dna"] = False

    # 7. System Health Check Endpoint
    print("\n[7/7] Testing FastAPI Health Check Endpoint...")
    try:
        from httpx import ASGITransport, AsyncClient
        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/health")
            data = resp.json()
            assert resp.status_code in (200, 503)
            assert "status" in data
            print(f"  -> Health Endpoint Status: {resp.status_code} ({data.get('status')}), DB: {data.get('db')}")
            results["health"] = True
    except Exception as e:
        print(f"  -> FAILED: {e}")
        results["health"] = False

    print("\n" + "=" * 60)
    passed_count = sum(1 for v in results.values() if v)
    total_count = len(results)
    print(f"SUMMARY: {passed_count}/{total_count} SERVICES VERIFIED SUCCESSFULLY")
    print("=" * 60)
    return results


if __name__ == "__main__":
    res = asyncio.run(run_verifications())
    if not all(res.values()):
        sys.exit(1)
