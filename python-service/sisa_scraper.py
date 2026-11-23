from typing import Dict, List
from urllib.parse import quote_plus

from featured_scraper import scrape_homepage
from playwright.sync_api import sync_playwright


def search_featured_products() -> List[Dict]:
    return scrape_homepage(
        "https://www.santaisabel.cl/",
        "lo más vendidos",
        "[data-cnstrc-item-name][data-cnstrc-item-price]",
        """() => {
            const heading = Array.from(
                document.querySelectorAll('h1, h2, h3, h4')
            ).find(
                element => element.innerText.toLowerCase().includes(
                    'lo más vendidos'
                )
            );
            const section = heading?.closest('section');
            if (!section) return [];

            const seen = new Set();
            return Array.from(
                section.querySelectorAll(
                    '[data-cnstrc-item-name][data-cnstrc-item-price]'
                )
            ).flatMap(card => {
                const name = card.getAttribute(
                    'data-cnstrc-item-name'
                )?.trim();
                const price = Number(
                    card.getAttribute('data-cnstrc-item-price')
                );
                const link = Array.from(card.querySelectorAll('a[href]'))
                    .find(
                        anchor => anchor.getAttribute('href').endsWith('/p')
                    );
                if (
                    !name ||
                    !Number.isFinite(price) ||
                    price <= 0 ||
                    seen.has(name)
                ) return [];
                seen.add(name);
                return [{
                    name,
                    price,
                    is_offer: /\\boferta\\b/i.test(card.innerText),
                    url: link ? link.href : null
                }];
            });
        }""",
    )


def search_santa_isabel(query: str) -> List[Dict]:
    results = []
    encoded_query = quote_plus(query)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto(
                f"https://www.santaisabel.cl/busca?ft={encoded_query}",
                wait_until="domcontentloaded",
                timeout=45000,
            )
            page.wait_for_selector(
                "[data-cnstrc-item-name][data-cnstrc-item-price]",
                timeout=15000,
            )

            products = page.evaluate(
                """() => Array.from(
                    document.querySelectorAll(
                        '[data-cnstrc-item-name][data-cnstrc-item-price]'
                    )
                ).map(card => {
                    const link = Array.from(card.querySelectorAll('a[href]'))
                        .find(anchor => anchor.getAttribute('href').endsWith('/p'));
                    return {
                        name: card.getAttribute('data-cnstrc-item-name'),
                        price: Number(card.getAttribute('data-cnstrc-item-price')),
                        is_offer: /\\boferta\\b/i.test(card.innerText),
                        url: link ? link.href : null
                    };
                }).filter(product =>
                    product.name && Number.isFinite(product.price) && product.price > 0
                )"""
            )

            seen = set()
            for product in products:
                name = product["name"]
                if name in seen:
                    continue
                seen.add(name)

                results.append(
                    {
                        "supermarket": "Santa Isabel",
                        "name": name,
                        "price": product["price"],
                        "is_offer": product["is_offer"],
                        "url": product["url"],
                    }
                )

                if len(results) >= 50:
                    break
        finally:
            browser.close()

    return results
