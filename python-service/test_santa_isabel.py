from curl_cffi import requests
import json

def test_santa_isabel():
    url = "https://www.santaisabel.cl/api/catalog_system/pub/products/search/mantequilla"
    try:
        r = requests.get(url, impersonate="chrome110")
        print("Santa Isabel status:", r.status_code)
        if r.status_code == 200:
            data = r.json()
            print(f"Found {len(data)} products")
            if len(data) > 0:
                print("First item:", data[0].get('productName'), data[0].get('items', [{}])[0].get('sellers', [{}])[0].get('commertialOffer', {}).get('Price'))
    except Exception as e:
        print("Error", e)

test_santa_isabel()
