import json
import logging
import re
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from importlib import import_module

from fastapi import FastAPI, Request
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="TodoRetail Python Service")
logger = logging.getLogger("todoretail")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(handler)
logger.propagate = False
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,128}$")
SCRAPER_FUNCTIONS = {
    "Jumbo": ("jumbo_scraper", "search_jumbo"),
    "Santa Isabel": ("sisa_scraper", "search_santa_isabel"),
    "Unimarc": ("unimarc_scraper", "search_unimarc"),
}


@app.middleware("http")
async def log_requests(request: Request, call_next):
    incoming_request_id = request.headers.get("x-request-id", "")
    request_id = (
        incoming_request_id
        if REQUEST_ID_PATTERN.fullmatch(incoming_request_id)
        else str(uuid.uuid4())
    )
    request.state.request_id = request_id
    started_at = time.perf_counter()
    status_code = 500

    try:
        response = await call_next(request)
        status_code = response.status_code
        response.headers["x-request-id"] = request_id
        return response
    finally:
        level = (
            "error"
            if status_code >= 500
            else "warning"
            if status_code >= 400
            else "info"
        )
        logger.log(
            logging.ERROR
            if status_code >= 500
            else logging.WARNING
            if status_code >= 400
            else logging.INFO,
            json.dumps(
                {
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "level": level,
                    "service": "python-service",
                    "requestId": request_id,
                    "method": request.method,
                    "route": request.url.path,
                    "statusCode": status_code,
                    "durationMs": round((time.perf_counter() - started_at) * 1000),
                }
            )
        )

class ExtractionRequest(BaseModel):
    query: str
    supermarkets: List[str]

class ProductResult(BaseModel):
    supermarket: str
    name: str
    price: float
    is_offer: bool = False
    url: Optional[str] = None

class ExtractionResponse(BaseModel):
    status: str
    results: List[ProductResult]

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "python-fastapi"}

@app.post("/extract", response_model=ExtractionResponse)
def extract_data(request: ExtractionRequest, http_request: Request):
    request_id = http_request.state.request_id
    results = []

    supermarkets = list(
        dict.fromkeys(
            supermarket
            for supermarket in request.supermarkets
            if supermarket in SCRAPER_FUNCTIONS
        )
    )
    with ThreadPoolExecutor(max_workers=max(1, len(supermarkets))) as executor:
        futures = {
            executor.submit(run_scraper, supermarket, request.query): supermarket
            for supermarket in supermarkets
        }
        for future in as_completed(futures):
            supermarket = futures[future]
            try:
                products = future.result()
            except Exception as error:
                log_scraper_failure(supermarket, error, request_id)
                continue

            for product in products:
                try:
                    results.append(ProductResult(**product))
                except Exception as error:
                    log_scraper_failure(supermarket, error, request_id)

    return ExtractionResponse(status="success", results=results)


def run_scraper(supermarket: str, query: str) -> List[dict]:
    module_name, function_name = SCRAPER_FUNCTIONS[supermarket]
    scraper = getattr(import_module(module_name), function_name)
    return scraper(query)


def log_scraper_failure(supermarket: str, error: Exception, request_id: str) -> None:
    logger.warning(
        json.dumps(
            {
                "level": "warning",
                "service": "python-service",
                "event": "scraper_failed",
                "requestId": request_id,
                "supermarket": supermarket,
                "errorType": type(error).__name__,
            }
        )
    )
