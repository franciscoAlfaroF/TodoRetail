import requests
import json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://www.lider.cl',
    'Referer': 'https://www.lider.cl/',
}

# Lider search API endpoint is usually an Algolia index or a BFF (Backend For Frontend) API.
# Let's try the common bff endpoint:
url = "https://apps.lider.cl/catalogo/rest/custom/prodxsucursal" # Old endpoint?
# Actually they use bff.lider.cl/bff/v2/search or similar
# Let's just make a generic request to lider.cl to see what we get, or search github for lider scraper

def test_lider():
    try:
        r = requests.get("https://buysmart-bff-production.lider.cl/buysmart-bff/category", params={"category": "Lácteos"}, headers=headers, timeout=5)
        print("Status 1:", r.status_code)
    except Exception as e:
        print("Error 1:", e)
        
    try:
        url2 = "https://apps.lider.cl/catalogo/rest/custom/search?query=leche&limit=5"
        r2 = requests.get(url2, headers=headers, timeout=5)
        print("Status 2:", r2.status_code)
        if r2.status_code == 200:
            print(r2.text[:200])
    except Exception as e:
        print("Error 2:", e)

test_lider()
