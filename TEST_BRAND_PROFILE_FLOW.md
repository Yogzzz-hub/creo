# Client Brand Profile Questionnaire - End-to-End Test Guide

## Summary of Changes

### Backend (`apps/api`)
✅ **questionnaires.py** - All endpoints properly defined:
- `POST /api/v1/questionnaire` - Create new questionnaire (returns 409 if exists)
- `GET /api/v1/questionnaire` - Retrieve questionnaire with AI analysis
- `GET /api/v1/questionnaire/status` - Get status only
- `PATCH /api/v1/questionnaire` - Update existing questionnaire

✅ **ai_tasks.py** - Personalized 429 fallback:
- Generates AI analysis from actual client data
- No generic/predefined summaries
- Handles quota exhaustion without delays

### Frontend (`apps/web/components/brand-profile-tab.tsx`)
✅ **Smart questionnaire flow**:
- Attempts to fetch existing questionnaire on mount
- Tracks `questionnaireExists` state
- Uses `POST` for new questionnaires (creates)
- Uses `PATCH` for existing questionnaires (updates)
- Automatically triggers AI analysis regeneration after save
- Shows "Regenerating..." state for 3.5 seconds

---

## Step 1: Start the Backend Server

Run this command in `apps/api/`:

```powershell
cd "c:\Users\Pranav Rajesh\Desktop\AG\creo\apps\api"
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

---

## Step 2: Test the End-to-End Flow

### Test Case 1: Create New Questionnaire

**Setup:** Log in as a client who has NOT yet submitted a questionnaire

**Steps:**
1. Navigate to `/portal/account`
2. Click "Brand Profile" tab
3. Verify the form loads empty (no error)
4. Fill in all required fields:
   - Industry: "Digital Marketing"
   - Business Description: "E-commerce platform for small businesses"
   - Primary Goal: "Lead Generation"
   - Target Audience: Age 25-45, Location USA
   - Brand Tone: Select 2-3 options (e.g., "Professional", "Warm")
   - Social Handles: Fill Instagram/Facebook URLs
5. Click "Save & Regenerate Analysis"

**Expected Results:**
- ✅ Success toast: "Profile created! Generating your AI Brand Analysis..."
- ✅ Form data persists
- ✅ Spinner shows "Regenerating..." for 3.5 seconds
- ✅ AI Brand Analysis appears with:
  - Core Identity (summary line)
  - Recommended Brand Tone (tags)
  - Content Themes (bullets)
  - Audience Persona (paragraph)
  - Goal Alignment (paragraph)
- ✅ **No 404 error on POST /api/v1/questionnaire**
- ✅ Backend logs show:
  ```
  "POST /api/v1/questionnaire HTTP/1.1" 200 OK
  ```

---

### Test Case 2: Update Existing Questionnaire

**Setup:** Same client as Test Case 1 (questionnaire now exists)

**Steps:**
1. Already on Brand Profile tab (questionnaire loaded from GET)
2. Edit one answer: Change "Target Audience Location" from USA to Canada
3. Click "Save & Regenerate Analysis"

**Expected Results:**
- ✅ Success toast: "Profile updated! AI Analysis is regenerating..."
- ✅ Updated field (Location: Canada) persists
- ✅ Spinner shows "Regenerating..." for 3.5 seconds
- ✅ AI Analysis updates to reflect new location (should mention Canada in audience_persona)
- ✅ **No 404 error on PATCH /api/v1/questionnaire**
- ✅ Backend logs show:
  ```
  "PATCH /api/v1/questionnaire HTTP/1.1" 200 OK
  [Celery] Requesting Dify AI brand analysis for user <user_id>
  ```

---

### Test Case 3: Verify AI Analysis is Personalized (NOT Generic)

**Check the AI Analysis output for:**

❌ **Should NOT contain these phrases** (hardcoded/generic):
- "Educational, Community, Service Showcase"
- Generic industry descriptions
- Templated summaries

✅ **Should contain these specifics** (personalized):
- Client's actual industry ("Digital Marketing")
- Client's actual goal ("Lead Generation")
- Client's actual audience ("25-45 in Canada")
- Client's actual brand tone ("Professional, Warm")
- Relevant themes based on goal (e.g., "Lead Magnets", "Case Studies" for lead gen)

---

### Test Case 4: Verify Multiple Edits

**Steps:**
1. Edit Brand Tone: Add/remove options
2. Save
3. Verify analysis regenerates with new tone keywords
4. Edit Business Description
5. Save
6. Verify analysis regenerates with updated context

**Expected Results:**
- ✅ Each save triggers a new AI analysis
- ✅ Audience persona updates when audience changes
- ✅ Goal alignment updates when goal changes
- ✅ Brand tone tags update when tone changes
- ✅ Summary line always reflects current state

---

## Step 3: Verify Error Handling

### Test Missing Questionnaire (404)
- New client accessing Brand Profile
- Should show empty form, **not** an error message
- First save uses POST

### Test API Errors
- Stop the backend server
- Try to save questionnaire
- Should show: "Failed to save profile"
- Should NOT show: Raw API errors or 404s

---

## Step 4: Verify Authentication

### Test 401 Unauthorized
- Logout from the application
- Try to access `/portal/account` directly
- Should redirect to login (NOT 401 error)

### Test 403 Forbidden
- Login as a Team Member (not client)
- Try to access `/portal/account`
- Should redirect to dashboard (NOT 403 error)

---

## API Endpoint Verification

Run this to verify routes are registered:

```powershell
cd "c:\Users\Pranav Rajesh\Desktop\AG\creo\apps\api"
python -c "
from routers.questionnaires import router as q_router
print('Registered Questionnaire Routes:')
for route in q_router.routes:
    if hasattr(route, 'methods') and hasattr(route, 'path'):
        print(f'  {route.methods} {route.path}')
"
```

**Expected output:**
```
Registered Questionnaire Routes:
  {'POST'} /api/v1/questionnaire
  {'GET'} /api/v1/questionnaire
  {'GET'} /api/v1/questionnaire/status
  {'PATCH'} /api/v1/questionnaire
```

---

## Logs to Look For

### Success Flow Logs
```
[SUCCESS POST]
"POST /api/v1/questionnaire HTTP/1.1" 201 Created
Questionnaire created for user: <user_id>
[Celery] Requesting Dify AI brand analysis for user <user_id>

[SUCCESS PATCH]
"PATCH /api/v1/questionnaire HTTP/1.1" 200 OK
Updated questionnaire for user: <user_id>
[Celery] Requesting Dify AI brand analysis for user <user_id>
```

### Error Logs to Avoid
```
❌ "PATCH /api/v1/questionnaire HTTP/1.1" 404 Not Found
❌ "POST /api/v1/questionnaire HTTP/1.1" 404 Not Found
```

---

## Troubleshooting

### Issue: Still Getting 404 on `/api/v1/questionnaire`

**Cause 1: Old server still running**
```powershell
# Kill any existing uvicorn/python processes
Get-Process | Where-Object {$_.ProcessName -eq "python" -or $_.ProcessName -eq "uvicorn"} | Stop-Process -Force

# Restart
cd "c:\Users\Pranav Rajesh\Desktop\AG\creo\apps\api"
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Cause 2: Router not imported**
```powershell
# Verify router is imported in main.py
grep -i questionnaire "c:\Users\Pranav Rajesh\Desktop\AG\creo\apps\api\main.py"
# Should show both:
# - from routers.questionnaires import router as questionnaires_router
# - app.include_router(questionnaires_router)
```

**Cause 3: Authentication token expired**
- Logout and login again
- Frontend will get new JWT token

### Issue: AI Analysis Not Updating After Edit

**Check logs for:**
```
[Celery] Caught 429 quota exhausted. Applying immediate local fallback.
```

If you see this, it means Dify quota is exhausted - the system will use personalized fallback instead.

---

## Success Criteria ✅

After completing all tests, you should see:

- [ ] POST endpoint creates new questionnaire (no 404)
- [ ] GET endpoint retrieves questionnaire with AI analysis
- [ ] PATCH endpoint updates questionnaire (no 404)
- [ ] AI analysis regenerates after each PATCH
- [ ] Analysis is personalized (not generic)
- [ ] Frontend handles 404 gracefully (shows empty form)
- [ ] No errors in console or backend logs
- [ ] Complete flow: enter → save → analyze → edit → verify changes
