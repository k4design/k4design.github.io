import os,re,sys,time,urllib.parse as up
from concurrent.futures import ThreadPoolExecutor
import urllib.request

ROOT="https://bigskyquarry.com"
OUT="mirror"
UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"}
seen=set(); lock=__import__("threading").Lock()

def fetch(url):
    req=urllib.request.Request(url,headers=UA)
    with urllib.request.urlopen(req,timeout=60) as r:
        return r.read(), r.headers.get("Content-Type","")

def localpath(url):
    p=up.urlparse(url); path=p.path
    if path.endswith("/") or path=="":
        path=path+"index.html"
    elif "." not in os.path.basename(path):
        path=path+"/index.html"
    return os.path.join(OUT,path.lstrip("/"))

def save(url,data):
    fp=localpath(url)
    os.makedirs(os.path.dirname(fp),exist_ok=True)
    with open(fp,"wb") as f: f.write(data)
    return fp

def do(url):
    with lock:
        if url in seen: return None
        seen.add(url)
    try:
        data,ct=fetch(url)
        fp=save(url,data)
        print(f"OK {len(data):>8} {url}",flush=True)
        return (url,data,ct)
    except Exception as e:
        print(f"ERR {url} :: {e}",flush=True)
        return None

urls=[l.strip() for l in open("all_urls_full.txt") if l.strip()]
with ThreadPoolExecutor(8) as ex:
    list(ex.map(do,urls))
print("PAGES DONE",len(seen))
