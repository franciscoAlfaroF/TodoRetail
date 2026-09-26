from curl_cffi import requests

def test_jumbo():
    url = "https://jumbo.cl/api/catalog_system/pub/products/search/mantequilla"
    r = requests.get(url, impersonate="chrome110")
    print("Jumbo status:", r.status_code)
    if r.status_code == 200:
        data = r.json()
        print(f"Found {len(data)} Jumbo products")
        if len(data) > 0:
            print("First item:", data[0].get('productName'), data[0].get('items', [{}])[0].get('sellers', [{}])[0].get('commertialOffer', {}).get('Price'))

test_jumbo()
