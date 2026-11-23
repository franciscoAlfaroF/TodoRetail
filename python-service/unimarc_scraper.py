from playwright.sync_api import sync_playwright
from typing import List, Dict
import time
from featured_scraper import scrape_homepage


def search_featured_products() -> List[Dict]:
    products = scrape_homepage(
        "https://www.unimarc.cl/",
        "más vendidos",
        "a[href*='/product/']",
        """() => {
            const heading = Array.from(
                document.querySelectorAll('h1, h2, h3, h4')
            ).find(
                element => element.innerText.toLowerCase().includes(
                    'más vendidos'
                )
            );
            let section = heading;
            while (section) {
                const hasProducts = Array.from(
                    section.querySelectorAll('a')
                ).some(anchor => anchor.href.includes('/product/'));
                if (hasProducts) break;
                section = section.parentElement;
            }
            if (!section) return [];

            const seen = new Set();
            return Array.from(
                section.querySelectorAll('a[href*="/product/"]')
            )
                .flatMap(anchor => {
                    const url = anchor.href;
                    if (seen.has(url)) return [];
                    seen.add(url);

                    const card = anchor.closest('section[id^="shelf__vertical"]');
                    if (!card) return [];
                    const text = card.innerText;
                    const unitPrice = text.match(
                        /\\$\\s*[\\d.]+\\s*c\\/u\\b/i
                    );
                    const prices = Array.from(
                        text.matchAll(/\\$\\s*([\\d.]+)/g)
                    ).map(
                        match => Number(match[1].replace(/\\./g, ''))
                    );
                    const price = unitPrice
                        ? Number(
                            unitPrice[0].match(/[\\d.]+/)[0]
                                .replace(/\\./g, '')
                        )
                        : (prices[0] || 0);
                    const listPrice = unitPrice ? price : (prices[1] || price);

                    return [{
                        name: anchor.getAttribute('title')?.trim() ||
                            anchor.innerText.trim(),
                        price,
                        is_offer: /\\d+\\s*%/.test(text) ||
                            price < listPrice,
                        url
                    }];
                });
        }""",
    )
    return products


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
                        
                        let isOffer = prices.length > 1; 
                        if(!isOffer) {
                           isOffer = container.textContent.includes('%') || container.querySelector('[class*="line-through"]') !== null;
                        }
                        
                        let aTag = container.tagName === 'A' ? container : container.querySelector('a');
                        let url = aTag ? aTag.href : '';
                        res.push({name: name, price: minPrice, is_offer: isOffer, url: url});
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
                    "is_offer": prod.get('is_offer', False),
                    "url": prod['url']
                })
                
                if len(results) >= 50:
                    break
        finally:
            browser.close()
            
    return results
