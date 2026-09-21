import os,sys,urllib.request,urllib.parse as up
from concurrent.futures import ThreadPoolExecutor
UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36","Referer":"https://bigskyquarry.com/"}
OUT="mirror"
def lp(u):
    p=up.urlparse(u); path=p.path.lstrip("/")
    return os.path.join(OUT,path)
def do(u):
    fp=lp(u)
    if os.path.exists(fp) and os.path.getsize(fp)>0: return ("skip",u,0)
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=120)
        d=r.read()
        os.makedirs(os.path.dirname(fp),exist_ok=True)
        open(fp,"wb").write(d)
        return ("ok",u,len(d))
    except Exception as e:
        return ("err",u,str(e))
urls=[l.strip() for l in open(sys.argv[1]) if l.strip()]
res=[]
with ThreadPoolExecutor(12) as ex:
    for i,r in enumerate(ex.map(do,urls)):
        res.append(r)
        if r[0]=="err": print("ERR",r[1],r[2],flush=True)
from collections import Counter
print(Counter(r[0] for r in res))
print("bytes:",sum(r[2] for r in res if isinstance(r[2],int)))
