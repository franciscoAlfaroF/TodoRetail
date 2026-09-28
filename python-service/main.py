from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="TodoRetail Python Service")

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
def extract_data(request: ExtractionRequest):
    valid_supermarkets = {"Santa Isabel", "Unimarc", "Jumbo"}
    
    for sm in request.supermarkets:
        if sm not in valid_supermarkets:
            pass # Ignoramos silenciosamente si piden algo no soportado para no romper el front
            
    results = []
    
    if "Jumbo" in request.supermarkets:
        try:
            from jumbo_scraper import search_jumbo
            jumbo_products = search_jumbo(request.query)
            for prod in jumbo_products:
                results.append(ProductResult(**prod))
        except Exception as e:
            print("Error jumbo:", e)
            
    if "Santa Isabel" in request.supermarkets:
        try:
            from sisa_scraper import search_santa_isabel
            sisa_products = search_santa_isabel(request.query)
            for prod in sisa_products:
                results.append(ProductResult(**prod))
        except Exception as e:
            print("Error sisa:", e)
            
    if "Unimarc" in request.supermarkets:
        try:
            from unimarc_scraper import search_unimarc
            unimarc_products = search_unimarc(request.query)
            for prod in unimarc_products:
                results.append(ProductResult(**prod))
        except Exception as e:
            print("Error unimarc:", e)
        
    return ExtractionResponse(status="success", results=results)
