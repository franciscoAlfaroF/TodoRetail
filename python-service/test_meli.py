from curl_cffi import requests

def test_meli():
    url = "https://api.mercadolibre.com/sites/MLC/search?q=mantequilla&category=MLC1403"
    r = requests.get(url)
    print("Meli status:", r.status_code)
    if r.status_code == 200:
        data = r.json()
        print("Found", len(data.get('results', [])), "products")
        if data.get('results'):
            print("First item:", data['results'][0]['title'], data['results'][0]['price'])

test_meli()
