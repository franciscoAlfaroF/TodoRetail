import sys
from types import SimpleNamespace

from featured_scraper import scrape_featured_products


def test_scrape_featured_products_keeps_successes_when_one_source_fails(
    monkeypatch,
):
    monkeypatch.setattr(
        "featured_scraper.SCRAPERS",
        {
            "Jumbo": "jumbo_scraper",
            "Santa Isabel": "sisa_scraper",
            "Unimarc": "unimarc_scraper",
        },
    )
    monkeypatch.setitem(
        sys.modules,
        "jumbo_scraper",
        SimpleNamespace(
            search_featured_products=lambda: [
                {
                    "name": "Leche",
                    "price": 1000,
                    "url": "https://jumbo.cl/leche",
                }
            ]
        ),
    )
    monkeypatch.setitem(
        sys.modules,
        "sisa_scraper",
        SimpleNamespace(
            search_featured_products=lambda: (
                _ for _ in ()
            ).throw(TimeoutError())
        ),
    )
    monkeypatch.setitem(
        sys.modules,
        "unimarc_scraper",
        SimpleNamespace(
            search_featured_products=lambda: [
                {"name": "Pan", "price": 900},
                {"name": "Pan", "price": 900},
                {"name": "", "price": 900},
                {"name": "Precio inválido", "price": "n/a"},
                {"name": "Precio no finito", "price": float("nan")},
            ]
        ),
    )

    products, sources = scrape_featured_products()

    actual_products = {
        (product["supermarket"], product["name"]) for product in products
    }
    assert actual_products == {
        ("Jumbo", "Leche"),
        ("Unimarc", "Pan"),
    }
    source_statuses = {
        source["supermarket"]: source["status"] for source in sources
    }
    assert source_statuses == {
        "Jumbo": "ok",
        "Santa Isabel": "error",
        "Unimarc": "ok",
    }
