#!/usr/bin/env python3
import json, sys, time, urllib.request, urllib.parse, websocket, uuid
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4174/'
CDP = 'http://127.0.0.1:9223'
request = urllib.request.Request(CDP + '/json/new?' + urllib.parse.quote(URL), method='PUT')
with urllib.request.urlopen(request, timeout=5) as response:
    target = json.load(response)
ws = websocket.create_connection(target['webSocketDebuggerUrl'], timeout=15)
seq = 0
def call(method, params=None):
    global seq
    seq += 1
    ws.send(json.dumps({'id': seq, 'method': method, 'params': params or {}}))
    while True:
        item = json.loads(ws.recv())
        if item.get('id') == seq:
            return item.get('result', {})
def js(expr):
    result = call('Runtime.evaluate', {'expression': expr, 'returnByValue': True, 'awaitPromise': True})
    return result.get('result', {}).get('value')
def click_text(label):
    return js(f"(()=>{{const e=[...document.querySelectorAll('button,a')].find(x=>x.offsetParent!==null && x.innerText.trim()==={json.dumps(label)});if(!e)return false;e.click();return true}})()")
def text(): return js('document.body.innerText.slice(0,2400)')
def fields(): return js("[...document.querySelectorAll('input,textarea,select')].filter(x=>x.offsetParent!==null).map((x,i)=>({i,type:x.type,name:x.name,placeholder:x.placeholder,value:x.value,aria:x.getAttribute('aria-label')}))")
def fill(vals):
    return js("(v=>{const els=[...document.querySelectorAll('input,textarea,select')].filter(x=>x.offsetParent!==null); for(const [i,val] of Object.entries(v)){const e=els[Number(i)]; if(!e) continue; const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'value')?.set; setter?.call(e,val); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}));} return true})("+json.dumps(vals)+")")
def buttons(): return js("[...document.querySelectorAll('button')].map((x,i)=>({i,text:x.innerText.trim(),disabled:x.disabled,visible:x.offsetParent!==null})).filter(x=>x.text&&x.visible)")
rows=[]
time.sleep(3)
rows.append({'stage':'initial','text':text(),'fields':fields(),'buttons':buttons()})
# Open profile then the auth UI from the signed-out gate.
click_text('Profile'); time.sleep(.6)
rows.append({'stage':'profile_signed_out','text':text(),'buttons':buttons()})
for label in ['Sign in','Log in','Login','Create account','Register','Get started']:
    if click_text(label):
        rows.append({'stage':'opened_auth_'+label,'text':text(),'fields':fields(),'buttons':buttons()})
        break
# If auth panel has a register/create toggle, click it.
for label in ['Create account','Register','Sign up','Sign Up']:
    if click_text(label):
        time.sleep(.3); rows.append({'stage':'register_mode','text':text(),'fields':fields(),'buttons':buttons()}); break
email='qa+'+uuid.uuid4().hex[:10]+'@example.com'
password='Bese26-QA-Password-2026!'
fs=fields()
# Fill by type/order: first email, password, then display/username as available.
vals={}
for f in fs:
    if f['type']=='email': vals[f['i']]=email
    elif f['type']=='password': vals[f['i']]=password
    elif f['type']=='text' and f['i'] not in vals: vals[f['i']]='QA Tester'
fill(vals); rows.append({'stage':'register_filled','email':email,'fields':fields()})
for label in ['Create account','Register','Sign up','Sign Up','Continue']:
    if click_text(label):
        time.sleep(2); rows.append({'stage':'register_submitted','text':text(),'buttons':buttons(),'fields':fields()}); break
# Try login mode and login with the test email (expected confirmation gate if email confirmation is enabled).
for label in ['Sign in','Log in','Login']:
    if click_text(label): time.sleep(.4); break
fs=fields(); vals={}
for f in fs:
    if f['type']=='email': vals[f['i']]=email
    elif f['type']=='password': vals[f['i']]=password
fill(vals)
for label in ['Sign in','Log in','Login','Continue']:
    if click_text(label):
        time.sleep(2); rows.append({'stage':'login_submitted','text':text(),'buttons':buttons(),'session':js("!!localStorage.getItem('sb-slxsbvuskgkacmtkkrmj-auth-token')")}); break
# Always collect auth state from the app's Supabase singleton if available.
rows.append({'stage':'final','url':js('location.href'),'body':text(),'rootLength':js('document.getElementById("root")?.innerText?.length||0'),'localStorageKeys':js('Object.keys(localStorage)')})
print(json.dumps(rows, indent=2, ensure_ascii=False))
ws.close()
