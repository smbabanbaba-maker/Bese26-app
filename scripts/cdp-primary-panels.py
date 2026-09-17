#!/usr/bin/env python3
import json, sys, time, urllib.request, urllib.parse
import websocket
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173/'
request = urllib.request.Request('http://127.0.0.1:9222/json/new?' + urllib.parse.quote(URL), method='PUT')
with urllib.request.urlopen(request, timeout=5) as response:
    target = json.load(response)
ws = websocket.create_connection(target['webSocketDebuggerUrl'], timeout=10)
seq = 0
def call(method, params=None):
    global seq
    seq += 1
    ws.send(json.dumps({'id': seq, 'method': method, 'params': params or {}}))
    while True:
        item = json.loads(ws.recv())
        if item.get('id') == seq: return item.get('result', {})
def js(expr):
    result = call('Runtime.evaluate', {'expression': expr, 'returnByValue': True, 'awaitPromise': True})
    return result.get('result', {}).get('value')
def click(label):
    return js(f"(()=>{{const e=[...document.querySelectorAll('button,a')].find(x=>x.innerText.trim()==={json.dumps(label)});if(!e)return false;e.click();return true}})()")
time.sleep(1)
rows=[]
for label in ['Notifications','Saved']:
    clicked=click(label); time.sleep(.5)
    rows.append({'panel':label,'clicked':clicked,'text':js('document.body.innerText.slice(0,700)'),'rendered':js('document.getElementById("root")?.innerText?.length>0')})
# Return to Profile and inspect auth-gated behavior.
click('Profile'); time.sleep(.4)
for label in ['My Listings','Saved Searches','Verification & Trust','Login & Security']:
    clicked=click(label); time.sleep(.3)
    rows.append({'profile_panel':label,'clicked':clicked,'text':js('document.body.innerText.slice(0,500)'),'rendered':js('document.getElementById("root")?.innerText?.length>0')})
    click('Profile'); time.sleep(.3)
rows.append({'console_errors':js('window.__bese26_test_errors?.length||0')})
print(json.dumps(rows, indent=2, ensure_ascii=False))
ws.close()
