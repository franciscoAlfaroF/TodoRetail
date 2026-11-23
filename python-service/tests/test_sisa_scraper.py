from types import SimpleNamespace

import sisa_scraper


def test_search_santa_isabel_extracts_current_catalog_cards(monkeypatch):
    calls = {}
    browser = SimpleNamespace(close=lambda: calls.update(browser_closed=True))
    page = SimpleNamespace(
        goto=lambda url, **kwargs: calls.update(goto=(url, kwargs)),
        wait_for_selector=lambda selector, **kwargs: calls.update(
            wait=(selector, kwargs)
        ),
        evaluate=lambda script: [
            {
                "name": "Crema Nestle",
                "price": 1290,
                "is_offer": True,
                "url": "https://www.santaisabel.cl/crema-nestle/p",
            },
            {
                "name": "Crema Nestle",
                "price": 1290,
                "is_offer": True,
                "url": "https://www.santaisabel.cl/crema-nestle/p",
            },
            {
                "name": "Crema Colun",
                "price": 1000,
                "is_offer": False,
                "url": "https://www.santaisabel.cl/crema-colun/p",
            },
        ],
    )
    browser.new_page = lambda: page
    playwright = SimpleNamespace(
        chromium=SimpleNamespace(launch=lambda **kwargs: browser)
    )

    class PlaywrightContext:
        def __enter__(self):
            return playwright

        def __exit__(self, *_):
            return False

    monkeypatch.setattr(sisa_scraper, "sync_playwright", PlaywrightContext)

    results = sisa_scraper.search_santa_isabel("crema leche")

    assert calls["goto"] == (
        "https://www.santaisabel.cl/busca?ft=crema+leche",
        {"wait_until": "domcontentloaded", "timeout": 45000},
    )
    assert calls["wait"] == (
        "[data-cnstrc-item-name][data-cnstrc-item-price]",
        {"timeout": 15000},
    )
    assert [product["name"] for product in results] == [
        "Crema Nestle",
        "Crema Colun",
    ]
    assert all(product["supermarket"] == "Santa Isabel" for product in results)
    assert results[0]["price"] == 1290
    assert results[0]["is_offer"] is True
    assert calls["browser_closed"] is True
