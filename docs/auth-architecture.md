# Creo Authentication Architecture

This document describes the flow and responsibilities of the Phone OTP authentication architecture in Creo.

## Core Principle: Supabase is the sole authority

In our architecture, **Supabase** handles the generation, validation, state management, and session creation for OTPs. We do not maintain any custom authentication database tables, nor do we cache OTPs in Redis.

## Flow: Requesting an OTP

1. The frontend (Next.js) requests an OTP by calling `supabase.auth.signInWithOtp({ phone: '+919876543210' })`.
2. Supabase receives the request, generates a secure 6-digit OTP, and stores it against the user's session.
3. Supabase triggers a webhook to our Custom SMS Provider endpoint (`/api/webhooks/sms`).
4. Our webhook validates the `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` header to ensure the request genuinely came from our Supabase instance.
5. Our webhook extracts the phone number and OTP from the payload, and forwards it to MSG91 for SMS delivery. MSG91 is strictly a dumb delivery layer (`otp_expiry=10` is hardcoded here just to prevent telecom-level re-delivery).

## Flow: Verifying an OTP

1. The frontend calls `supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' })`.
2. Supabase validates the token internally.
3. If successful, Supabase returns the session/JWT to the frontend.
4. The frontend routes the user to `/portal` or `/dashboard` based on their role metadata.

## Required Configuration

For this flow to be secure and operational, the following configuration is **mandatory**:

1. **Supabase Dashboard OTP Expiry:** You must log into the Supabase Dashboard, navigate to **Authentication -> Providers -> Phone**, and configure the **OTP Expiry to 600 seconds (10 minutes)**. The code cannot enforce this, as Supabase is the sole authority.
2. **Environment Variables:** The backend requires `MSG91_AUTH_KEY` and `MSG91_SENDER_ID` to successfully deliver the SMS.

## Security Boundaries

- The frontend **must never** have access to the `SUPABASE_SERVICE_ROLE_KEY`. It only uses the `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- The webhook endpoint `POST /api/webhooks/sms` **must never** execute without verifying the service role key, otherwise attackers could use it to send free SMS messages at our expense.
