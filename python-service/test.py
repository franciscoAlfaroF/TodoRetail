from curl_cffi import requests
import json
from bs4 import BeautifulSoup

def find_products(obj, results):
    if isinstance(obj, dict):
        if "priceInfo" in obj and "name" in obj:
            results.append(obj)
        for k, v in obj.items():
            find_products(v, results)
    elif isinstance(obj, list):
        for item in obj:
            find_products(item, results)

def scrape_lider(query):
    url = f"https://www.lider.cl/supermercado/search?query={query}"
    r = requests.get(url, impersonate="chrome110")
    if r.status_code == 200:
        soup = BeautifulSoup(r.text, 'html.parser')
        script = soup.find('script', id='__NEXT_DATA__')
        if script:
            data = json.loads(script.string)
            results = []
            find_products(data, results)
            extracted = []
            for item in results:
                try:
                    price = item.get('priceInfo', {}).get('currentPrice', {}).get('price')
                    name = item.get('name')
                    # Walmart ids
                    id = item.get('id')
                    if price and name:
                        extracted.append({
                            "supermarket": "Lider",
                            "name": name,
                            "price": price,
                            "url": f"https://www.lider.cl/supermercado/product/sku/{id}" if id else ""
                        })
                except Exception:
                    pass
            print(f"Found {len(extracted)} products!")
            if extracted:
                print(extracted[0])
            return extracted
    return []

scrape_lider("mantequilla")
