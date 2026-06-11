import httpx
# 先清理再seed
print('Calling seed API...')
resp = httpx.post('https://mysh.tech/api/admin/seed', timeout=60)
print(f'Status: {resp.status_code}')
print(f'Full response: {resp.text}')

# 再查partners
resp2 = httpx.get('https://mysh.tech/api/partners', timeout=30)
data = resp2.json()
total = data.get('pagination', {}).get('total', 0)
print(f'\nPartners count: {total}')
if data.get('data'):
    for p in data['data'][:3]:
        print(f'  - {p.get("company_name")} ({p.get("partner_type")})')
