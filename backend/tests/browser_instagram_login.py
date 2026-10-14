"""Run with Vite at localhost:5173. All API/provider traffic is mocked."""
import asyncio
import base64
import json
from urllib.parse import urlparse
from playwright.async_api import async_playwright, expect

BASE = 'http://localhost:5173'
USER = {'id': 'test-client', 'email': 'client@example.test', 'full_name': 'Test Brand', 'role': 'client', 'account_status': 'active', 'onboarding_stage': 8}

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context()
        token = 'mock.' + base64.urlsafe_b64encode(json.dumps({'exp':4102444800}).encode()).decode().rstrip('=') + '.mock'
        await context.add_init_script('localStorage.setItem("creo_access_token",' + json.dumps(token) + ');localStorage.setItem("creo_auth_user",' + json.dumps(json.dumps(USER)) + ');')
        calls = []
        configured = True
        async def route(r):
            path = urlparse(r.request.url).path
            if '/api/' not in path:
                if r.request.url.startswith(BASE): return await r.continue_()
                return await r.abort()
            calls.append((r.request.method, r.request.url))
            if path.endswith('/auth/me'): body = USER
            elif path.endswith('/onboarding/status'): body = {'stage':8, 'is_complete':True}
            elif 'subscription' in path: body = {'is_active':True, 'subscription':{'status':'active'}}
            elif path.endswith('/portal/profile'): body = {**USER, 'company_name':'Test Brand'}
            elif path.endswith('/instagram/connect'):
                assert 'provider=instagram' in r.request.url
                body = {'url':BASE+'/loader-preview', 'state':'ig:'+'s'*32, 'verifier':'v'*32}
            elif path.endswith('/instagram/callback'):
                assert r.request.post_data_json['state'] == 'ig:'+'s'*32
                body = {'selection_id':'selection', 'accounts':[{'id':'12345','username':'test_brand','page_name':''}]}
            elif path.endswith('/integrations/instagram'):
                body = {'connected':False, 'status':'disconnected','configured':True,'instagram_login_configured':configured,'publishing_enabled':False}
            elif 'notifications' in path: body = {'items':[], 'unread_count':0,'total':0}
            else: body = []
            await r.fulfill(json=body, headers={'Access-Control-Allow-Origin':BASE,'Access-Control-Allow-Credentials':'true'})
        await context.route('**/*', route)
        page = await context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(BASE+'/portal/account?tab=integrations')
        button = page.get_by_role('button', name='Connect Instagram directly', exact=True)
        await expect(button).to_be_enabled()
        await expect(page.get_by_role('button',name='Connect with Facebook',exact=True)).to_be_visible()
        await button.click()
        await page.wait_for_url('**/loader-preview')
        saved = await page.evaluate('JSON.parse(sessionStorage.getItem("creo-instagram-oauth"))')
        assert saved['state'].startswith('ig:') and saved['userId']==USER['id']
        await page.goto(BASE+'/portal/account/instagram?code=mock&state='+saved['state']+'#_=_')
        await expect(page.get_by_role('button',name='@test_brand')).to_be_visible()
        configured = False
        await page.goto(BASE+'/portal/account?tab=integrations')
        await expect(page.get_by_role('button',name='Connect Instagram directly',exact=True)).to_be_disabled()
        assert not errors, errors
        print('PASS: direct login button, Facebook option, saved state, callback rendering, and disabled unconfigured state')
        await browser.close()

asyncio.run(main())
