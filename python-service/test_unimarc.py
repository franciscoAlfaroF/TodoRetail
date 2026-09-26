from curl_cffi import requests
import json

def test_unimarc():
    url = "https://api.smdigital.cl:8443/v1/es/search?name=mantequilla"
    try:
        r = requests.get(url, impersonate="chrome110")
        print("Unimarc status:", r.status_code)
        if r.status_code == 200:
            print(r.text[:500])
    except Exception as e:
        print("Error", e)

test_unimarc()
