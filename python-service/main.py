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
    valid_supermarkets = {"Jumbo", "Lider", "Santa Isabel"}
    
    for sm in request.supermarkets:
        if sm not in valid_supermarkets:
            raise HTTPException(status_code=400, detail=f"Supermercado '{sm}' no soportado aǧn.")
            
    results = []
    
    if "Jumbo" in request.supermarkets:
        results.append(
            ProductResult(supermarket="Jumbo", name=f"{request.query} Premium (Mock)", price=2500, url="https://jumbo.cl/mock")
        )
        
    if "Lider" in request.supermarkets:
        results.append(
            ProductResult(supermarket="Lider", name=f"{request.query} Acuenta (Mock)", price=1990, url="https://lider.cl/mock")
        )
        
    if "Santa Isabel" in request.supermarkets:
        try:
            from sisa_scraper import search_santa_isabel
            sisa_products = search_santa_isabel(request.query)
            for prod in sisa_products:
                results.append(ProductResult(**prod))
        except Exception as e:
            print("Error sisa:", e)
        
    return ExtractionResponse(status="success", results=results)
