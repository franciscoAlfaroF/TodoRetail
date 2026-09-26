from curl_cffi import requests
import json
from bs4 import BeautifulSoup

def scrape_lider_html(query):
    url = f"https://www.lider.cl/supermercado/search?query={query}"
    r = requests.get(url, impersonate="chrome110")
    print("Status:", r.status_code)
    
    if r.status_code == 200:
        soup = BeautifulSoup(r.text, 'html.parser')
        script = soup.find('script', id='__NEXT_DATA__')
        if script:
            data = json.loads(script.string)
            print("Found NEXT_DATA")
            # Usually the products are deep inside props.pageProps
            # Let's just dump a small part
            print(str(data)[:500])
        else:
            print("No NEXT_DATA found")
    
scrape_lider_html("mantequilla")
