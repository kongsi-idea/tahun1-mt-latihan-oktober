"""一年级10月数学练习 端到端测试。Supabase 一律拦截（假名单 ?code=TEST-1I），绝不写真库。
用法：先 `python3 -m http.server 8791 --bind 127.0.0.1`，再 `python3 test-e2e.py`。
截图放 ~/Documents/my-agent/playwright-to-delete/（三种视窗各一张）。"""
import os, json, sys, urllib.request
from playwright.sync_api import sync_playwright

BASE = os.environ.get('TARGET', 'http://127.0.0.1:8791/index.html')
URL = BASE + '?code=TEST-1I'
SHOTS = os.path.expanduser('~/Documents/my-agent/playwright-to-delete')
os.makedirs(SHOTS, exist_ok=True)
TABLE = 'tahun1_mt_latihan_okt_answers'
NAMES = ['陈小明', '林美美', '黄大伟', '李安琪']
CLASSES = [{'id': 'c1', 'class_name': '1I', 'play_code': 'TEST-1I', 'schools': {'full_name': '测试小学'},
            'students': [{'name': n, 'name_zh': n, 'name_en': None, 'seat_no': i + 1} for i, n in enumerate(NAMES)]}]

# 每题：(学生答案, 期望 is_correct, 期望 error_tag)。刻意混合：一半答对、一半答成题号表里的典型错误。
PLAN = [
    ('q1-1', '四分之一', False, 'frac-counted-blank'), ('q1-2', '四分之一', True, None),
    ('q2-1', 3, False, 'frac-numerator-off'),
    ('q3-1', 5020, False, 'concat-digits'), ('q3-2', 12, True, None), ('q3-3', 120, False, 'wrong-operation'), ('q3-4', 5, False, 'count-one-note'),
    ('q4-1', '70 仙', True, None), ('q4-2', '70 仙', False, 'unit-confusion'), ('q4-3', 'RM1', True, None),
    ('q5-1', 1, False, 'no-exchange'), ('q5-2', 2, True, None),
    ('q6-1', '星期二', False, 'weekday-swapped'), ('q6-2', '星期二', True, None),
    ('q7-1', 12, False, 'read-minute-hand'), ('q7-2a', '分针', False, 'hands-swapped'), ('q7-2b', '分针', True, None),
    ('q8a', '中午', True, None), ('q8b', '傍晚', False, 'dusk-vs-night'),
    ('q9-1', '四分之三', False, 'rest-vs-eaten'), ('q9-2', 1, True, None),
    ('q10a', 100, False, 'forgot-convert'), ('q10b', 1, True, None),
    ('q11a', '圆柱体', True, None), ('q11b', {'plane': 2, 'curved': 1, 'vertex': 2}, False, 'vertex-miscount'),
    ('q12', 72, False, 'concat-digits'),
    ('q13a', '1D', False, 'ignore-scale'), ('q13b', 28, True, None), ('q13c', '1D', True, None),
]
IDS = [p[0] for p in PLAN]
assert len(IDS) == 29

posts = []      # 拦截到的 insert 载荷（每次 POST 一个 list）
mode = {'post': 201}
def mock(route):
    req = route.request; url = req.url
    if '/rest/v1/classes' in url:
        return route.fulfill(status=200, content_type='application/json', body=json.dumps(CLASSES))
    if f'/rest/v1/{TABLE}' in url:
        if req.method == 'POST':
            try: posts.append(json.loads(req.post_data or '[]'))
            except Exception: posts.append(['<解析失败>'])
            if mode['post'] == 500:
                return route.fulfill(status=500, content_type='application/json', body='{"message":"boom"}')
            return route.fulfill(status=201, content_type='application/json', body='')
        return route.fulfill(status=200, content_type='application/json', body='[]')   # 学生端本来就不该 select
    return route.fulfill(status=200, content_type='application/json', body='[]')

fails = 0
def check(name, ok, extra=''):
    global fails
    print(('  ✅ ' if ok else '  ❌ ') + name + (f' — {extra}' if extra else ''))
    if not ok: fails += 1

def answer(page, id_, val):
    kind = page.evaluate(f"() => window.__latihan.Bank.items.find(i => i.id === '{id_}').entry.kind")
    if kind == 'choice':
        page.click(f'.chip[data-v="{val}"]')
    elif kind == 'number':
        for ch in str(val): page.click(f'.key[data-k="{ch}"]')
    elif kind == 'cells':
        for i in range(val): page.click(f'.cell[data-i="{i}"]')
    elif kind == 'multi':
        for i, k in enumerate(['plane', 'curved', 'vertex']):
            page.click(f'.mfield[data-i="{i}"]')
            for ch in str(val[k]): page.click(f'.key[data-k="{ch}"]')

def cur(page): return page.evaluate('() => window.__latihan.S.ids[window.__latihan.S.idx]')

def new_page(br, vw=1366, vh=768, errs=None, mobile=False):
    ctx = br.new_context(viewport={'width': vw, 'height': vh}, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1)
    page = ctx.new_page()
    page.route('**/*.supabase.co/**', mock)
    if errs is not None:
        page.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        page.on('console', lambda m: m.type == 'error' and errs.append('console: ' + m.text))
    return ctx, page

def to_quiz(page, name=None):
    page.goto(URL); page.wait_for_timeout(1200)
    page.click('#btnStart'); page.wait_for_selector('.name-btn')
    if name: page.click(f'.name-btn:has-text("{name}")')

def run_all(page, plan=PLAN, upto=None):
    for i, (id_, val, _, _) in enumerate(plan):
        assert cur(page) == id_, (cur(page), id_)
        answer(page, id_, val)
        if upto is not None and i + 1 >= upto: return
        if i < len(plan) - 1: page.click('#btnNext')

with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []

    # ───── 1. 名单 → 作答 29 题 → 交卷 ─────
    print('1) 选名字 → 29 小项各答一次 → 交卷')
    ctx, page = new_page(br, errs=errs)
    page.goto(URL); page.wait_for_timeout(1200)
    page.screenshot(path=f'{SHOTS}/latihan-cover-desktop.png')
    page.click('#btnStart'); page.wait_for_selector('.name-btn')
    names = page.eval_on_selector_all('.name-btn span', 'els => els.map(e => e.textContent)')
    check('名单大按钮读到 4 位', names == NAMES, str(names))
    check('有「找不到我的名字？」', page.is_visible('#btnManual'))
    page.click('.name-btn:has-text("陈小明")'); page.wait_for_timeout(300)
    check('进入第 1 题', cur(page) == 'q1-1' and '第 1 题 / 共 29 题' in page.inner_text('#qCount'), page.inner_text('#qCount'))
    check('做的过程中不显示对错', page.locator('#quiz :text("正确"), #quiz :text("答对"), #quiz :text("答错")').count() == 0)
    # 上一题/下一题：第 1 题 prev 不可用
    check('第 1 题没有上一题', page.is_disabled('#btnPrev'))
    run_all(page)
    check('最后一题按钮写「交卷」', page.inner_text('#btnNext') == '交卷')
    # 回头改答案：回到 q13b 改成 14 再改回 28
    page.click('#btnPrev'); check('上一题回得去', cur(page) == 'q13b')
    page.click('.key[data-k="clear"]'); answer(page, 'q13b', 14)
    check('回头改答案：存档里是 14', page.evaluate("() => window.__latihan.S.answers['q13b']") == 14)
    page.click('.key[data-k="clear"]'); answer(page, 'q13b', 28)
    page.click('#btnNext'); page.click('#btnNext')
    check('交卷确认对话框出现', page.is_visible('#confirmOverlay'), page.inner_text('#confirmMsg'))
    page.click('#btnConfirmYes'); page.wait_for_selector('#done.is-active', timeout=5000)
    check('只送出 1 次 insert', len(posts) == 1)
    rows = posts[0]
    check('载荷 29 行', len(rows) == 29, str(len(rows)))
    need = {'play_code', 'student_name', 'in_roster', 'source', 'attempt_no', 'item_id', 'answer', 'is_correct', 'error_tag'}
    check('字段齐全且无多余字段', all(set(r.keys()) == need for r in rows))
    check('play_code=TEST-1I、student_name=陈小明、in_roster=true', all(r['play_code'] == 'TEST-1I' and r['student_name'] == '陈小明' and r['in_roster'] is True for r in rows))
    check("source='online'、attempt_no=1", all(r['source'] == 'online' and r['attempt_no'] == 1 for r in rows))
    check('item_id 与题号表一致且顺序对', [r['item_id'] for r in rows] == IDS)
    bad = [(r['item_id'], r['answer'], r['is_correct'], r['error_tag']) for r, (i, a, c, t) in zip(rows, PLAN) if not (r['answer'] == a and r['is_correct'] is c and r['error_tag'] == t)]
    check('每行 answer／is_correct／error_tag 与预期一致', not bad, str(bad[:3]))
    check('答错类型覆盖 ≥14 种 tag', len({r['error_tag'] for r in rows if r['error_tag']}) >= 14, str(len({r['error_tag'] for r in rows if r['error_tag']})))
    nright = sum(1 for _, _, c, _ in PLAN if c)
    check(f'完成页显示 {nright}/29', page.inner_text('#score').replace(' ', '') == f'{nright}/29', page.inner_text('#score'))
    wl = page.locator('#wrongList li').count()
    check('列出全部答错的小项', wl == 29 - nright, str(wl))
    check('错题显示正确答案与提示', '正确答案' in page.inner_text('#wrongList') and '所以' in page.inner_text('#wrongList'))
    page.screenshot(path=f'{SHOTS}/latihan-done-desktop.png', full_page=True)

    # ───── 2. 再试一次错的题（attempt 2）─────
    print('2) 再试一次错的题')
    page.click('#btnRedo'); page.wait_for_timeout(300)
    wrong_ids = [i for i, _, c, _ in PLAN if not c]
    check('只出错的题', page.evaluate('() => window.__latihan.S.ids') == wrong_ids and f'共 {len(wrong_ids)} 题' in page.inner_text('#qCount'), page.inner_text('#qCount'))
    check('上一轮的答案已清空', page.evaluate("() => Object.keys(window.__latihan.S.answers).filter(k => window.__latihan.S.ids.includes(k)).length") == 0)
    correct = {it['id']: it['correct'] for it in page.evaluate('() => window.__latihan.Bank.items')}
    for k, id_ in enumerate(wrong_ids):
        answer(page, id_, correct[id_])
        if k < len(wrong_ids) - 1: page.click('#btnNext')
    page.click('#btnNext'); page.click('#btnConfirmYes'); page.wait_for_selector('#done.is-active')
    check('第二次 insert：attempt_no=2、只含错题、全对', len(posts) == 2 and all(r['attempt_no'] == 2 and r['is_correct'] for r in posts[1]) and [r['item_id'] for r in posts[1]] == wrong_ids)
    check('完成页 29/29 全对', page.inner_text('#score').replace(' ', '') == '29/29' and page.is_hidden('#btnRedo'))
    ctx.close()

    # ───── 3. 手动输入名字 ─────
    print('3) 手动输入名字')
    posts.clear()
    ctx, page = new_page(br, errs=errs)
    to_quiz(page)
    page.click('#btnManual'); page.fill('#manualName', '新同学小丽'); page.click('#manualForm button[type=submit]'); page.wait_for_timeout(300)
    answer(page, 'q1-1', '四分之三'); page.click('#btnNext'); answer(page, 'q1-2', '四分之一')
    for _ in range(27): page.click('#btnNext')
    check('一路下一题到最后一题', cur(page) == 'q13c')
    page.click('#btnNext'); check('没做完不能交卷，只能回去做', '还有 27 题' in page.inner_text('#confirmMsg') and page.is_hidden('#btnConfirmYes'), page.inner_text('#confirmMsg'))
    page.click('#btnConfirmNo'); page.wait_for_timeout(200)
    check('点「去做没做的题」跳到第一个没做的题', cur(page) == 'q2-1', cur(page))
    check('没做完时没有送出任何答案', len(posts) == 0, str(len(posts)))
    ctx.close()

    # ───── 4. 刷新恢复 ─────
    print('4) 做一半刷新页面能恢复')
    posts.clear()
    ctx, page = new_page(br, errs=errs)
    to_quiz(page, '林美美')
    run_all(page, upto=6)          # 答完 q3-3 前 6 题，停在第 6 题
    page.click('#btnNext'); page.click('#btnNext')   # 到第 8 题 q4-1
    here = cur(page)
    page.reload(); page.wait_for_timeout(1200)
    page.click('#btnStart'); page.wait_for_selector('.name-btn'); page.click('.name-btn:has-text("林美美")'); page.wait_for_timeout(300)
    check(f'恢复到上次那一题 {here}', cur(page) == here, cur(page))
    saved = page.evaluate("() => window.__latihan.S.answers")
    check('前面的答案还在', saved.get('q1-1') == '四分之一' and saved.get('q3-1') == 5020, str(saved))
    ctx.close()

    # ───── 5. 交卷失败不丢答案 ─────
    print('5) 交卷失败（500）答案不丢、可重试')
    posts.clear(); mode['post'] = 500
    ctx, page = new_page(br, errs=[])    # 500 本来就会让浏览器记一条 console error，这里不计入
    to_quiz(page, '黄大伟')
    run_all(page)
    page.click('#btnNext'); page.click('#btnConfirmYes'); page.wait_for_selector('#failed.is-active', timeout=20000)
    check('显示「没送出去，再试一次」按钮', '没送出去，再试一次' in page.inner_text('#btnRetrySend'))
    ls = page.evaluate("() => Object.entries(localStorage).filter(([k]) => k.startsWith('latihan-okt:TEST-1I:黄大伟')).map(([k, v]) => JSON.parse(v))")
    check('localStorage 存着全部 29 题答案和待送出的行', len(ls) == 1 and len(ls[0]['answers']) == 29 and len(ls[0]['pending']) == 29)
    page.reload(); page.wait_for_timeout(1200); page.click('#btnStart'); page.wait_for_selector('.name-btn'); page.click('.name-btn:has-text("黄大伟")')
    check('刷新后仍停在「没送出去」', page.is_visible('#failed.is-active'))
    mode['post'] = 201
    n0 = len(posts)
    page.click('#btnRetrySend'); page.wait_for_selector('#done.is-active', timeout=8000)
    check('重试成功，送出同样 29 行', len(posts) == n0 + 1 and len(posts[-1]) == 29 and posts[-1][0]['attempt_no'] == 1)
    ctx.close()

    # ───── 6. 三种视窗：截图／溢出／按钮 ≥48px ─────
    print('6) 手机、平板、桌面：截图、无横向溢出、按钮 ≥48px、控制台')
    SIZES = [('phone', 390, 844, True), ('tablet', 820, 1180, True), ('desktop', 1366, 768, False)]
    SHOW = ['q1-1', 'q3-2', 'q6-1', 'q7-2a', 'q11b', 'q13b']     # 覆盖 choice／number／flow／箭头钟面／multi／图表
    for name, vw, vh, mob in SIZES:
        e2 = []
        ctx, page = new_page(br, vw, vh, errs=e2, mobile=mob)
        to_quiz(page, '李安琪')
        small = []
        overflow = False
        for k, id_ in enumerate(IDS):
            if cur(page) != id_: raise SystemExit('顺序错')
            btns = page.evaluate("""() => [...document.querySelectorAll('#quiz button, #quiz .cell[data-i]')].filter(b => b.offsetParent && !b.disabled).map(b => { const r = b.getBoundingClientRect(); return [b.className + ':' + (b.textContent || '').slice(0, 6), Math.round(r.width), Math.round(r.height)]; })""")
            small += [(id_, b) for b in btns if min(b[1], b[2]) < 48]
            if page.evaluate('() => document.documentElement.scrollWidth > innerWidth + 1 || document.querySelector("#qBody").scrollWidth > document.querySelector("#qBody").clientWidth + 1'): overflow = True
            if id_ in SHOW and id_ in ('q1-1', 'q7-2a', 'q11b', 'q13b') and name != 'tablet' or (name == 'tablet' and id_ == 'q7-2a'):
                page.wait_for_timeout(150); page.screenshot(path=f'{SHOTS}/latihan-{name}-{id_}.png')
            if id_ == 'q13b' : pass
            answer(page, id_, PLAN[k][1]); page.click('#btnNext') if k < 28 else None
        check(f'{name} {vw}x{vh}：所有按钮／格子 ≥48px', not small, str(small[:3]))
        check(f'{name}：29 题都没有横向溢出', not overflow)
        check(f'{name}：控制台无红字', not e2, str(e2[:2]))
        # 封面与选名字也截一张
        ctx.close()
    # 全套对比图：各视窗的「选名字」页
    for name, vw, vh, mob in SIZES:
        ctx, page = new_page(br, vw, vh, mobile=mob)
        page.goto(URL); page.wait_for_timeout(1000); page.click('#btnStart'); page.wait_for_selector('.name-btn'); page.wait_for_timeout(200)
        page.screenshot(path=f'{SHOTS}/latihan-{name}-pick.png')
        ctx.close()

    # ───── 7. 语音 ─────
    print('7) 29 个小项全部有预录语音')
    ctx, page = new_page(br)
    page.goto(URL); page.wait_for_timeout(800)
    lines = page.evaluate('() => window.__latihan.allVoiceLines()')
    clips = page.evaluate('() => window.VOICE_CLIPS')
    check('29 题都有句子', len(lines) == 29 and all(l['text'] for l in lines))
    check('每句都在 manifest 里', all(l['key'] in clips for l in lines))
    ok = True
    for l in lines:
        try:
            r = urllib.request.urlopen(f"{BASE.rsplit('/', 1)[0]}/audio/{l['key']}.mp3"); ok &= (r.status == 200 and len(r.read()) > 1000)
        except Exception as ex: ok = False
    check('mp3 文件都能取到（200、>1KB）', ok)
    ctx.close()

    # ───── 8. 其余 ─────
    print('8) 整体')
    check('跑完整个流程控制台无红字（不含刻意的 500）', not errs, str(errs[:3]))
    br.close()

print('\n失败 %d 项' % fails if fails else '\n全部通过')
sys.exit(1 if fails else 0)
