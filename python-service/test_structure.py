from curl_cffi import requests
import json
from bs4 import BeautifulSoup

def scrape_lider(query):
    url = f"https://www.lider.cl/supermercado/search?query={query}"
    r = requests.get(url, impersonate="chrome110")
    if r.status_code == 200:
        soup = BeautifulSoup(r.text, 'html.parser')
        script = soup.find('script', id='__NEXT_DATA__')
        if script:
            data = json.loads(script.string)
            # Find the path of the search results
            try:
                # The search results are usually in props.pageProps.initialTempoData.data.contentLayout.modules ...
                # Let's dump the types of modules
                modules = data['props']['pageProps']['initialTempoData']['data']['contentLayout']['modules']
                for m in modules:
                    print(m['type'], m.get('name'))
                    if m['type'] == 'product-list' or m['type'] == 'Grid':
                        pass
                
                # Or look at props.pageProps.initialTempoData.queries
                queries = data['props']['pageProps']['initialTempoData'].get('queries', [])
                for q in queries:
                    print("Query:", q.get('query', {}).get('operationName'))
            except Exception as e:
                print("Error:", e)

scrape_lider("mantequilla")
