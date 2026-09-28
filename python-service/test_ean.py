from playwright.sync_api import sync_playwright
import time
import json

def test_unimarc_ean():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.unimarc.cl/search?q=mantequilla", wait_until="domcontentloaded", timeout=60000)
        time.sleep(5)
        
        next_data = page.evaluate("""() => {
            let script = document.getElementById('__NEXT_DATA__');
            return script ? script.innerText : null;
        }""")
        
        if next_data:
            data = json.loads(next_data)
            print(str(data)[:500])
            if 'ean' in str(data).lower():
                print("EAN FOUND in NEXT_DATA")
                        
        browser.close()

if __name__ == "__main__":
    test_unimarc_ean()
