from playwright.sync_api import sync_playwright
from typing import List, Dict
import re

def search_santa_isabel(query: str) -> List[Dict]:
    results = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        url = f"https://www.santaisabel.cl/busca?ft={query}"
        
        try:
            page.goto(url, wait_until="networkidle", timeout=30000)
            
            # Extract data via JS
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
                        res.push({name: name, price: minPrice, url: card.href, is_offer: isOffer});
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
                    "supermarket": "Santa Isabel",
                    "name": name,
                    "price": prod['price'],
                    "is_offer": prod.get('is_offer', False),
                    "url": prod['url']
                })
                
                if len(results) >= 50:
                    break
                    
        except Exception as e:
            print(f"Error scraping Santa Isabel: {e}")
        finally:
            browser.close()
            
    return results
