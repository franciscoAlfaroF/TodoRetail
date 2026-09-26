import urllib.request
import json

data = json.dumps({"query": "mantequilla", "supermarkets": ["Santa Isabel"]}).encode('utf-8')
req = urllib.request.Request("http://localhost:8000/extract", data=data, headers={'Content-Type': 'application/json'})
try:
    response = urllib.request.urlopen(req)
    print(response.read().decode())
except Exception as e:
    print(e)
