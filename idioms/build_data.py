import json, re, sys
src, out = sys.argv[1], sys.argv[2]
data = json.load(open(src))
def clean(s):
    if s is None: return ''
    s = str(s).replace('_x000D_', '').replace('\r', '')
    return re.sub(r'\n{2,}', '\n', s).strip()
def split_names(s):
    return [x.strip() for x in re.split(r'[、，,]', clean(s)) if x.strip()]
mains = [d for d in data if d['主條成語／非主條成語'] == '主條成語']
mainset = {d['成語'] for d in mains}
alias = {}
for d in mains:
    for a in split_names(d['參考詞語']):
        if a not in mainset: alias.setdefault(a, d['成語'])
for d in data:
    n = d['成語']
    if n in mainset or n in alias: continue
    m = re.search(r'[即見]「([^」]+)」', clean(d['釋義']))
    if m and m.group(1) in mainset: alias[n] = m.group(1)
TONES = 'ˊˇˋ˙'
def zykey(z):
    z = clean(z).split('（變）')[0]
    return ''.join(c for c in z if c not in TONES and not c.isspace())
entries = []
for d in mains:
    senses = []
    sem = clean(d['用法說明-語義說明']).split('＆') if clean(d['用法說明-語義說明']) else []
    cat = clean(d['用法說明-使用類別']).split('＆')
    ex = re.split(r'\n?＆\n?', clean(d['用法說明-例句']))
    for i, s in enumerate(sem):
        senses.append({'義': s.strip(), '類': (cat[i] if i < len(cat) else '').strip(),
                       '例': [x.strip() for x in (ex[i] if i < len(ex) else '').split('\n') if x.strip()]})
    table = []
    t = clean(d['辨識-例句'])
    if t:
        rows = [r.split('\t') for r in t.split('\n') if r.strip()]
        table = rows
    entries.append({
        'id': int(d['編號']), 'w': d['成語'], 'zy': clean(d['注音']), 'py': clean(d['漢語拼音']),
        'k': zykey(d['注音']), '釋': clean(d['釋義']), '源': clean(d['典源文獻名稱']),
        '典': clean(d['典故說明']), '用': senses,
        '形音': clean(d['辨識-形音辨誤']), '同': clean(d['辨識-同']), '異': clean(d['辨識-異']), '辨例': table,
        '近': split_names(d['近義成語']), '反': split_names(d['反義成語']), '參': split_names(d['參考詞語']),
    })
json.dump({'version': '2020_20260929', 'entries': entries, 'alias': alias}, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(entries), len(alias))
