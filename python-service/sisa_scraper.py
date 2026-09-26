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
                const res = [];
                const prices = Array.from(document.querySelectorAll('*')).filter(el => 
                    el.children.length === 0 && 
                    el.textContent.trim().startsWith('$') && 
                    !el.textContent.includes('kg') && 
                    !el.textContent.includes('-')
                );
                
                prices.forEach(p => {
                    let container = p.closest('a') || p.closest('[data-testid="product-card"]') || p.closest('div[class*="product"]');
                    if (container) {
                        let nameEl = container.querySelector('h3, h2, [class*="name"]');
                        let name = nameEl ? nameEl.textContent.trim() : container.textContent.substring(0, 50).trim();
                        let url = container.href || '';
                        res.push({name: name, price: p.textContent.trim(), url: url});
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
                
                price_str = prod['price'].replace('$', '').replace('.', '').replace(' ', '')
                try:
                    price = float(price_str)
                except ValueError:
                    continue
                
                results.append({
                    "supermarket": "Santa Isabel",
                    "name": name,
                    "price": price,
                    "url": prod['url']
                })
                
                if len(results) >= 50:
                    break
                    
        except Exception as e:
            print(f"Error scraping Santa Isabel: {e}")
        finally:
            browser.close()
            
    return results
