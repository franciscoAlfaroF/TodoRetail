from playwright.sync_api import sync_playwright
import json

def test_interception(query):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        products_data = []
        
        def handle_response(response):
            if "graphql" in response.url or "search" in response.url or "products" in response.url:
                if response.request.resource_type in ["fetch", "xhr"]:
                    try:
                        text = response.text()
                        if query.lower() in text.lower():
                            print(f"Found {query} in {response.url}")
                            products_data.append(text)
                    except:
                        pass
        
        page.on("response", handle_response)
        page.goto(f"https://www.santaisabel.cl/busca?ft={query}", wait_until="networkidle", timeout=30000)
        
        if products_data:
            print("Extracted Data:", products_data[0][:500])
        else:
            print("No matching XHR found.")
            
        browser.close()

test_interception("mantequilla")
