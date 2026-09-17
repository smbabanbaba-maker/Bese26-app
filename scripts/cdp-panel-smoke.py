#!/usr/bin/env python3
import json, sys, time, urllib.request, urllib.parse
import websocket

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173/'
CDP = 'http://127.0.0.1:9222'

def call(ws, method, params=None, ident=[0]):
    ident[0] += 1
    ws.send(json.dumps({'id': ident[0], 'method': method, 'params': params or {}}))
    while True:
        item = json.loads(ws.recv())
        if item.get('id') == ident[0]:
            return item.get('result', {})

def eval_js(ws, expression):
    result = call(ws, 'Runtime.evaluate', {'expression': expression, 'returnByValue': True, 'awaitPromise': True})
    return result.get('result', {}).get('value')

request = urllib.request.Request(CDP + '/json/new?' + urllib.parse.quote(URL), method='PUT')
with urllib.request.urlopen(request, timeout=5) as response:
    target = json.load(response)
ws = websocket.create_connection(target['webSocketDebuggerUrl'], timeout=10)
call(ws, 'Page.enable')
call(ws, 'Runtime.enable')
time.sleep(2)

checks = []
def check(name, expression):
    value = eval_js(ws, expression)
    checks.append({'name': name, 'value': value})

check('home', "document.body.innerText.includes('WELCOME TO BESE26')")
check('nav labels', "[...document.querySelectorAll('nav button')].map(x=>x.innerText.trim())")
check('home buttons', "[...document.querySelectorAll('button,a')].map(x=>x.innerText.trim()).filter(Boolean).slice(0,25)")
for label in ['Search', 'Sell', 'Messages', 'Business', 'Profile']:
    expr = f"(()=>{{const e=[...document.querySelectorAll('button,a')].find(x=>x.innerText.trim()==={json.dumps(label)}); if(!e)return 'not-found'; e.click(); return 'clicked'}})()"
    check('click ' + label, expr)
    time.sleep(.6)
    check(label.lower() + ' visible text', 'document.body.innerText.slice(0,500)')
    check(label.lower() + ' root rendered', 'document.getElementById("root")?.innerText?.length > 0')
check('console error count', 'window.__bese26_test_errors?.length || 0')
print(json.dumps(checks, indent=2, ensure_ascii=False))
ws.close()
