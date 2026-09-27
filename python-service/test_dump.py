from playwright.sync_api import sync_playwright

def dump_product_cards():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.santaisabel.cl/busca?ft=mantequilla", wait_until="networkidle", timeout=30000)
        
        # Get all text and HTML of elements that look like cards
        html = page.evaluate("""() => {
            let cards = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('/p') && a.textContent.includes('$'));
            if (cards.length === 0) {
                cards = Array.from(document.querySelectorAll('div')).filter(d => d.textContent.includes('Mantequilla') && d.textContent.includes('$'));
            }
            return cards.slice(0, 5).map(c => c.innerHTML);
        }""")
        
        for idx, card in enumerate(html):
            print(f"--- CARD {idx} ---")
            print(card)
        
        browser.close()

dump_product_cards()
