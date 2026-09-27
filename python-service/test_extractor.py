from playwright.sync_api import sync_playwright

def test_new_extractor():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.santaisabel.cl/busca?ft=mantequilla", wait_until="networkidle", timeout=30000)
        
        products = page.evaluate("""() => {
            let res = [];
            let cards = Array.from(document.querySelectorAll('a')).filter(a => a.href && a.href.includes('/p') && a.textContent.includes('$'));
            
            cards.forEach(card => {
                let nameEl = card.querySelector('h2, h3, [class*="name"]');
                if(!nameEl) return;
                let name = nameEl.textContent.trim();
                
                let textNodes = [];
                let walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT, null, false);
                let node;
                while(node = walker.nextNode()) {
                    let text = node.textContent.trim();
                    if(text.startsWith('$') && !text.includes('kg') && !text.includes('-')) {
                        textNodes.push(text);
                    }
                }
                
                let prices = textNodes.map(p => parseFloat(p.replace('$', '').replace('.', ''))).filter(v => !isNaN(v));
                if(prices.length > 0) {
                    let minPrice = Math.min(...prices);
                    let isOffer = prices.length > 1; 
                    if(!isOffer) {
                       isOffer = card.textContent.toLowerCase().includes('oferta');
                    }
                    res.push({name: name, price: minPrice, url: card.href, is_offer: isOffer, debug_prices: prices});
                }
            });
            return res;
        }""")
        
        for p in products[:10]:
            print(p)
            
        browser.close()

test_new_extractor()
