from playwright.sync_api import sync_playwright
import time

def dump_jumbo():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.jumbo.cl/busca?ft=mantequilla", wait_until="domcontentloaded", timeout=60000)
        time.sleep(8)
        
        cards = page.evaluate("""() => {
            let res = [];
            // Get text elements with $
            let moneyEls = Array.from(document.querySelectorAll('*')).filter(el => 
                el.children.length === 0 && el.textContent.trim().startsWith('$')
            );
            
            // Find their containers
            moneyEls.forEach(el => {
                let container = el.parentElement;
                for(let i=0; i<4; i++) {
                    if(container && container.parentElement) container = container.parentElement;
                }
                if(container && !res.includes(container.innerHTML)) {
                    res.push(container.innerHTML);
                }
            });
            return res.slice(0, 3);
        }""")
        
        print(f"Encontrados {len(cards)} contenedores con $")
        for idx, html in enumerate(cards):
            print(f"--- ITEM {idx} ---")
            print(html)
            
        browser.close()

if __name__ == "__main__":
    dump_jumbo()
