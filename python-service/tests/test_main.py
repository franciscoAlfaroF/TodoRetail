import sys
from types import SimpleNamespace

from main import ExtractionRequest, extract_data, health_check


def test_health_check_reports_service_status():
    assert health_check() == {"status": "ok", "service": "python-fastapi"}


def test_extract_returns_empty_results_when_no_supermarkets_are_requested():
    response = extract_data(ExtractionRequest(query="leche", supermarkets=[]))

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

    response = extract_data(ExtractionRequest(query="leche", supermarkets=["Jumbo"]))

    assert response.status == "success"
    assert len(response.results) == 1
    assert response.results[0].supermarket == "Jumbo"
    assert response.results[0].name == "leche entera"
    assert response.results[0].price == 1200
