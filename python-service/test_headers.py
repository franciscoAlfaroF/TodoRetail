from playwright.sync_api import sync_playwright

def test_interception():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        def handle_request(route, request):
            if "bff.santaisabel.cl" in request.url:
                print("HEADERS:", request.headers)
            route.continue_()
            
        page.route("**/*", handle_request)
        page.goto("https://www.santaisabel.cl/busca?ft=mantequilla", wait_until="networkidle", timeout=30000)
        browser.close()

test_interception()
