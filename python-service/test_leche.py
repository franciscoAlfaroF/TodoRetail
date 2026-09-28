from playwright.sync_api import sync_playwright

def test_leche():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.santaisabel.cl/busca?ft=leche", wait_until="networkidle", timeout=30000)
        
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
                    // Ignoramos si tiene letras (para descartar $10.000 x lt, x kg, etc) o el signo '-'
                    if(text.startsWith('$') && !/[a-zA-Z]/.test(text) && !text.includes('-')) {
                        textNodes.push(text);
                    }
                }
                
                let prices = textNodes.map(p => parseFloat(p.replace('$', '').replace('.', '').replace(/\\D/g, ''))).filter(v => !isNaN(v));
                if(prices.length > 0) {
                    let minPrice = Math.min(...prices);
                    let isOffer = prices.length > 1; 
                    if(!isOffer) {
                       isOffer = card.textContent.toLowerCase().includes('oferta');
                    }
                    res.push({name: name, price: minPrice, is_offer: isOffer, debug_texts: textNodes});
                }
            });
            return res;
        }""")
        
        for p in products[:15]:
            print(p)
            
        browser.close()

test_leche()
