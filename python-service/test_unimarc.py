from playwright.sync_api import sync_playwright
import time

def test_unimarc():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.unimarc.cl/search?q=mantequilla", wait_until="domcontentloaded", timeout=60000)
        time.sleep(8)
        
        products = page.evaluate("""() => {
            let res = [];
            
            // Find all text nodes with $
            let textNodes = [];
            let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while(node = walker.nextNode()) {
                let text = node.textContent.trim();
                if(text.startsWith('$') && !/[a-zA-Z]/.test(text) && !text.includes('-')) {
                    textNodes.push(node);
                }
            }
            
            // Group by common container (like an <a> tag or a <div> with a specific size)
            let containers = new Map();
            textNodes.forEach(node => {
                let parent = node.parentElement;
                let container = parent.closest('a') || parent.closest('div[class*="shelf"]') || parent.closest('div[class*="Card"]');
                
                // Fallback: go up 5 levels
                if(!container) {
                    container = parent;
                    for(let i=0; i<6; i++) {
                        if(container && container.parentElement) container = container.parentElement;
                    }
                }
                
                if(container) {
                    if(!containers.has(container)) containers.set(container, []);
                    containers.get(container).push(node.textContent.trim());
                }
            });
            
            containers.forEach((pricesText, container) => {
                // Try to find name
                let name = '';
                let nameEl = container.querySelector('h2, h3, p[class*="name"], p[class*="title"], div[class*="name"]');
                if(nameEl) {
                    name = nameEl.textContent.trim();
                } else {
                    // Just get the longest text node that doesn't have a $
                    let w = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
                    let n;
                    let longest = '';
                    while(n = w.nextNode()) {
                        let t = n.textContent.trim();
                        if(!t.includes('$') && t.length > longest.length) longest = t;
                    }
                    name = longest;
                }
                
                let prices = pricesText.map(p => parseFloat(p.replace('$', '').replace('.', '').replace(/\\D/g, ''))).filter(v => !isNaN(v));
                if(prices.length > 0 && name.length > 5) {
                    let minPrice = Math.min(...prices);
                    // Find URL
                    let aTag = container.tagName === 'A' ? container : container.querySelector('a');
                    let url = aTag ? aTag.href : '';
                    res.push({name: name, price: minPrice, url: url});
                }
            });
            
            return res;
        }""")
        
        seen = set()
        for p in products:
            if p['name'] not in seen:
                seen.add(p['name'])
                print(p)
            
        browser.close()

if __name__ == "__main__":
    test_unimarc()
