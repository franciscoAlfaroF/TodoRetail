from concurrent.futures import ThreadPoolExecutor, as_completed
from importlib import import_module
import json
import logging
import math
from typing import Dict, List

from playwright.sync_api import sync_playwright

SCRAPERS = {
    "Jumbo": "jumbo_scraper",
    "Santa Isabel": "sisa_scraper",
    "Unimarc": "unimarc_scraper",
}

logger = logging.getLogger("todoretail")


def scrape_homepage(
    url: str, heading: str, product_selector: str, extraction_script: str
) -> List[Dict]:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_function(
                """({heading, selector}) => {
                    const hasHeading = Array.from(
                        document.querySelectorAll('h1, h2, h3, h4')
                    ).some(element => {
                        const text = element.innerText.toLowerCase();
                        return text.includes(heading);
                    });
                    const hasProducts =
                        document.querySelectorAll(selector).length > 0;
                    return hasHeading && hasProducts;
                }""",
                arg={"heading": heading.lower(), "selector": product_selector},
                timeout=20000,
            )
            products = page.evaluate(extraction_script)
            if not products:
                raise RuntimeError(
                    "Featured product section returned no products"
                )
            return products
        finally:
            browser.close()


def scrape_featured_products() -> tuple[List[Dict], List[Dict]]:
    results = []
    sources = []

    with ThreadPoolExecutor(max_workers=len(SCRAPERS)) as executor:
        futures = {
            executor.submit(
                getattr(import_module(module_name), "search_featured_products")
            ): supermarket
            for supermarket, module_name in SCRAPERS.items()
        }

        for future in as_completed(futures):
            supermarket = futures[future]
            try:
                products = future.result()
            except Exception as error:
                sources.append(
                    {
                        "supermarket": supermarket,
                        "status": "error",
                        "result_count": 0,
                    }
                )
                logger.warning(
                    json.dumps(
                        {
                            "level": "warning",
                            "service": "python-service",
                            "event": "featured_scrape_failed",
                            "supermarket": supermarket,
                            "errorType": type(error).__name__,
                        }
                    )
                )
                continue

            validated_products = []
            seen = set()
            for product in products:
                name = str(product.get("name", "")).strip()
                try:
                    price = float(product.get("price", 0))
                except (TypeError, ValueError):
                    continue
                if (
                    not name
                    or not math.isfinite(price)
                    or price <= 0
                    or name in seen
                ):
                    continue
                seen.add(name)
                validated_products.append(
                    {
                        "supermarket": supermarket,
                        "name": name,
                        "price": price,
                        "is_offer": bool(product.get("is_offer", False)),
                        "url": product.get("url"),
                    }
                )

            results.extend(validated_products)
            sources.append(
                {
                    "supermarket": supermarket,
                    "status": "ok",
                    "result_count": len(validated_products),
                }
            )

    return results, sources
