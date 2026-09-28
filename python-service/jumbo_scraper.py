from playwright.sync_api import sync_playwright
import json
from typing import List, Dict
import time

def search_jumbo(query: str) -> List[Dict]:
    results = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        url = f"https://www.jumbo.cl/busca?ft={query}"
        
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            time.sleep(8)
            
            products = page.evaluate("""() => {
                let res = [];
                let elements = document.querySelectorAll('[data-gtm-product-click]');
                
                elements.forEach(el => {
                    try {
                        let data = JSON.parse(el.getAttribute('data-gtm-product-click'));
                        if (data && data.name && data.price) {
                            
                            // Check if it's an offer
                            // Look at the closest parent card to find offer flags
                            let card = el.closest('div.w-full') || el.closest('li') || el.closest('div');
                            let isOffer = false;
                            if (card) {
                                let html = card.innerHTML.toLowerCase();
                                isOffer = html.includes('line-through') || html.includes('% dcto') || html.includes('oferta');
                            }
                            
                            res.push({
                                name: data.name,
                                price: data.price,
                                is_offer: isOffer,
                                url: el.href || ('https://www.jumbo.cl' + (el.getAttribute('href') || ''))
                            });
                        }
                    } catch(e) {}
                });
                return res;
            }""")
            
            seen = set()
            for prod in products:
                name = prod['name']
                if name in seen or not name:
                    continue
                seen.add(name)
                
                # Fix URL if it's relative or empty
                url = prod['url']
                if not url or url == 'https://www.jumbo.cl':
                    url = f"https://www.jumbo.cl/busca?ft={query}"
                elif url.startswith('/'):
                    url = f"https://www.jumbo.cl{url}"
                    
                results.append({
                    "supermarket": "Jumbo",
                    "name": name,
                    "price": prod['price'],
                    "is_offer": prod['is_offer'],
                    "url": url
                })
                
                if len(results) >= 50:
                    break
                    
        except Exception as e:
            print(f"Error scraping Jumbo: {e}")
        finally:
            browser.close()
            
    return results

if __name__ == "__main__":
    for p in search_jumbo("mantequilla")[:10]:
        print(p)
