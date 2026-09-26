from playwright.sync_api import sync_playwright

def test_sisa_pw():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.santaisabel.cl/busca?ft=mantequilla", wait_until="networkidle", timeout=30000)
        
        # JS script to find all items
        products = page.evaluate("""() => {
            const results = [];
            // Get all texts containing $ that are likely prices
            const prices = Array.from(document.querySelectorAll('*')).filter(el => 
                el.children.length === 0 && 
                el.textContent.trim().startsWith('$') && 
                !el.textContent.includes('kg') && 
                !el.textContent.includes('-')
            );
            
            prices.forEach(p => {
                // Find nearest a tag parent or sibling
                let container = p.closest('a') || p.closest('[data-testid="product-card"]') || p.closest('div[class*="product"]');
                if (container) {
                    let nameEl = container.querySelector('h3, h2, [class*="name"]');
                    let name = nameEl ? nameEl.textContent : container.textContent.substring(0, 50);
                    let url = container.href || '';
                    results.push({name: name, price: p.textContent.trim(), url: url});
                }
            });
            return results;
        }""")
        
        for p in products:
            print(p)
            
        browser.close()

test_sisa_pw()
