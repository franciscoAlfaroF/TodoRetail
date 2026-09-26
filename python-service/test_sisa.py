from curl_cffi import requests
from bs4 import BeautifulSoup
import json

def test_sisa_html():
    url = "https://www.santaisabel.cl/busca?ft=mantequilla"
    r = requests.get(url, impersonate="chrome110")
    print("Status:", r.status_code)
    soup = BeautifulSoup(r.text, 'html.parser')
    
    # Try VTEX IO format
    script = soup.find('template', {'data-type': 'json'})
    if script:
        print("Found VTEX IO json")
        # print(script.string[:200])
        return

    # Try Next.js
    script = soup.find('script', id='__NEXT_DATA__')
    if script:
        print("Found NEXT_DATA")
        return
        
    print("Nothing found. HTML excerpt:")
    print(r.text[:500])

test_sisa_html()
