import re,os,urllib.request,urllib.parse as up
from concurrent.futures import ThreadPoolExecutor
UA={"User-Agent":"Mozilla/5.0 AppleWebKit/537.36 Chrome/120"}
def norm(t):
    t=re.sub(r'nonce=["\'][^"\']*["\']','',t)
    t=re.sub(r'\?ver=[0-9a-zA-Z._-]+','',t)
    t=re.sub(r'[0-9a-f]{32}','',t)                      # gf field hashes
    t=re.sub(r'gform_ajax_frame_1[^"\']*','',t)
    t=re.sub(r'"timestamp":\d+|\d{10,}','',t)
    t=re.sub(r'\s+',' ',t).strip()
    return t
def check(u):
    path=up.urlparse(u).path.lstrip("/")
    fp=os.path.join("mirror",path+"index.html" if path.endswith("/") or not path else path)
    if not path: fp="mirror/index.html"
    if not os.path.exists(fp): return (u,"MISSING",0)
    try: live=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60).read().decode("utf-8","replace")
    except Exception as e: return (u,f"FETCH {e}",0)
    a,b=norm(live),norm(open(fp,encoding="utf-8",errors="replace").read())
    if a==b: return (u,"IDENTICAL",0)
    # similarity
    import difflib
    r=difflib.SequenceMatcher(None,a,b).quick_ratio()
    return (u,f"DIFF ratio={r:.4f} livelen={len(a)} mirlen={len(b)}",1)
urls=[l.strip() for l in open("all_urls_full.txt") if l.strip() and "/author/" not in l]
with ThreadPoolExecutor(6) as ex: res=list(ex.map(check,urls))
ident=[r for r in res if r[1]=="IDENTICAL"]
print(f"{len(ident)}/{len(res)} byte-identical to live (after normalizing nonces/versions/hashes)\n")
for u,s,bad in res:
    if s!="IDENTICAL": print(f"  {s}\n     {u}")
