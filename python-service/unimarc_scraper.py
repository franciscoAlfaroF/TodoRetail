from playwright.sync_api import sync_playwright
from typing import List, Dict
import time

def search_unimarc(query: str) -> List[Dict]:
    results = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        url = f"https://www.unimarc.cl/search?q={query}"
        
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
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
                
                // Group by common container
                let containers = new Map();
                textNodes.forEach(node => {
                    let parent = node.parentElement;
                    let container = parent.closest('a') || parent.closest('div[class*="shelf"]') || parent.closest('div[class*="Card"]');
                    
                    // Fallback
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
                    let name = '';
                    let nameEl = container.querySelector('h2, h3, p[class*="name"], p[class*="title"], div[class*="name"]');
                    if(nameEl) {
                        name = nameEl.textContent.trim();
                    } else {
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
                        let aTag = container.tagName === 'A' ? container : container.querySelector('a');
                        let url = aTag ? aTag.href : '';
                        res.push({name: name, price: minPrice, url: url});
                    }
                });
                
                return res;
            }""")
            
            seen = set()
            for prod in products:
                name = prod['name']
                if name in seen or not name:
                    continue
                seen.add(name)
                
                results.append({
                    "supermarket": "Unimarc",
                    "name": name,
                    "price": prod['price'],
                    "is_offer": False,
                    "url": prod['url']
                })
                
                if len(results) >= 50:
                    break
                    
        except Exception as e:
            print(f"Error scraping Unimarc: {e}")
        finally:
            browser.close()
            
    return results
