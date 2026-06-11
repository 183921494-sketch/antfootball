import httpx

print('=== 蚂蚁足球功能测试 ===\n')

# 1. 首页
resp = httpx.get('https://mysh.tech/', timeout=30, follow_redirects=True)
print(f'1. 首页: {resp.status_code} ({len(resp.text)} bytes)')

# 2. 球队API - A组
resp = httpx.get('https://mysh.tech/api/teams?group=A', timeout=30)
data = resp.json()
teams = data.get('data', [])
print(f'2. A组球队: {len(teams)} 队')
if teams:
    name = teams[0].get('name')
    msi = teams[0].get('msi_score')
    print(f'   示例: {name} (MSI: {msi})')

# 3. 比赛API - 全部
resp = httpx.get('https://mysh.tech/api/matches', timeout=30)
data = resp.json()
matches = data.get('data', [])
print(f'3. 全部比赛: {len(matches)} 场')

# 4. 合作方API
resp = httpx.get('https://mysh.tech/api/partners', timeout=30)
data = resp.json()
partners = data.get('data', [])
print(f'4. 合作方: {len(partners)} 家')
if partners:
    pname = partners[0].get('name')
    ptype = partners[0].get('type')
    print(f'   示例: {pname} ({ptype})')

# 5. 管理员登录
resp = httpx.post('https://mysh.tech/api/admin/login',
    json={'email': 'admin@antfootball.com', 'password': 'NF2026admin'},
    timeout=30)
data = resp.json()
success = '成功' if data.get('success') else '失败'
print(f'5. 管理员登录: {success}')
if data.get('user'):
    uname = data['user']['name']
    role = data['user']['role']
    print(f'   用户: {uname} ({role})')

# 6. 测试后台页面
resp = httpx.get('https://mysh.tech/admin/login', timeout=30, follow_redirects=True)
print(f'6. 后台登录页: {resp.status_code} ({len(resp.text)} bytes)')

print('\n=== 测试完成 ===')
