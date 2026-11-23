import sys
from threading import Barrier
from types import SimpleNamespace

from starlette.requests import Request

from main import ExtractionRequest, extract_data, health_check


def create_request():
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/extract",
            "headers": [],
            "query_string": b"",
            "server": ("test", 80),
            "client": ("test", 123),
            "scheme": "http",
        }
    )
    request.state.request_id = "test-request-001"
    return request


def test_health_check_reports_service_status():
    assert health_check() == {"status": "ok", "service": "python-fastapi"}


def test_featured_endpoint_returns_products_and_per_source_status(monkeypatch):
    monkeypatch.setattr(
        "main.scrape_featured_products",
        lambda: (
            [
                {
                    "supermarket": "Jumbo",
                    "name": "Leche",
                    "price": 1000,
                    "is_offer": False,
                    "url": "https://www.jumbo.cl/leche/p",
                }
            ],
            [{"supermarket": "Jumbo", "status": "ok", "result_count": 1}],
        ),
    )

    from main import get_featured_products

    response = get_featured_products()

    assert response.status == "success"
    assert response.results[0].supermarket == "Jumbo"
    assert response.sources[0].result_count == 1


def test_extract_returns_empty_results_when_no_supermarkets_are_requested():
    response = extract_data(
        ExtractionRequest(query="leche", supermarkets=[]), create_request()
    )

    assert response.status == "success"
    assert response.results == []


def test_extract_returns_products_from_selected_supermarket(monkeypatch):
    monkeypatch.setitem(
        sys.modules,
        "jumbo_scraper",
        SimpleNamespace(
            search_jumbo=lambda query: [
                {"supermarket": "Jumbo", "name": f"{query} entera", "price": 1200}
            ]
        ),
    )

    response = extract_data(
        ExtractionRequest(query="leche", supermarkets=["Jumbo"]), create_request()
    )

    assert response.status == "success"
    assert len(response.results) == 1
    assert response.results[0].supermarket == "Jumbo"
    assert response.results[0].name == "leche entera"
    assert response.results[0].price == 1200


def test_extract_runs_supermarket_scrapers_concurrently(monkeypatch):
    barrier = Barrier(3)

    def create_scraper(supermarket):
        def search(query):
            barrier.wait(timeout=2)
            return [
                {
                    "supermarket": supermarket,
                    "name": f"{query} {supermarket}",
                    "price": 1200,
                }
            ]

        return search

    monkeypatch.setitem(
        sys.modules, "jumbo_scraper", SimpleNamespace(search_jumbo=create_scraper("Jumbo"))
    )
    monkeypatch.setitem(
        sys.modules,
        "sisa_scraper",
        SimpleNamespace(search_santa_isabel=create_scraper("Santa Isabel")),
    )
    monkeypatch.setitem(
        sys.modules,
        "unimarc_scraper",
        SimpleNamespace(search_unimarc=create_scraper("Unimarc")),
    )

    response = extract_data(
        ExtractionRequest(
            query="crema", supermarkets=["Jumbo", "Santa Isabel", "Unimarc"]
        ),
        create_request(),
    )

    assert {product.supermarket for product in response.results} == {
        "Jumbo",
        "Santa Isabel",
        "Unimarc",
    }


def test_extract_returns_partial_results_if_a_scraper_fails(monkeypatch):
    monkeypatch.setitem(
        sys.modules,
        "jumbo_scraper",
        SimpleNamespace(
            search_jumbo=lambda query: [
                {"supermarket": "Jumbo", "name": f"{query} entera", "price": 1200}
            ]
        ),
    )
    monkeypatch.setitem(
        sys.modules,
        "sisa_scraper",
        SimpleNamespace(
            search_santa_isabel=lambda query: (_ for _ in ()).throw(TimeoutError())
        ),
    )

    response = extract_data(
        ExtractionRequest(query="leche", supermarkets=["Jumbo", "Santa Isabel"]),
        create_request(),
    )

    assert len(response.results) == 1
    assert response.results[0].supermarket == "Jumbo"
