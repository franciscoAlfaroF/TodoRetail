const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
};

async function test() {
  try {
    const res = await fetch('https://apps.lider.cl/catalogo/rest/custom/search?query=leche&limit=5', { headers });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log(text.substring(0, 200));
  } catch(e) {
    console.error(e);
  }
}
test();
