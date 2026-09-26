from curl_cffi import requests

def test_url(url):
    r = requests.get(url, impersonate="chrome110", allow_redirects=False)
    print(f"{url} -> Status: {r.status_code}, Location: {r.headers.get('location')}")

test_url("https://www.lider.cl/supermercado/search?query=mantequilla")
test_url("https://www.lider.cl/catalogo/search?query=mantequilla")
