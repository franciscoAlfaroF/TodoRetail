from curl_cffi import requests

headers = {
    'apikey': 'be-reg-groceries-sisa-catalog-wdhhq5a2fken', 
    'x-client-platform': 'web',
}

r = requests.get("https://bff.santaisabel.cl/catalog/search-suggestions?term=mantequilla", headers=headers, impersonate="chrome110")
print("Status:", r.status_code)
if r.status_code == 200:
    data = r.json()
    items = data.get('data', {}).get('products', [])
    print(f"Found {len(items)} products!")
    if items:
        print("First item:", items[0].get('name'), items[0].get('price', {}).get('defaultPrice'))
else:
    print(r.text)
