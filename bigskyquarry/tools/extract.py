import os,re,json
urls=set()
pat=re.compile(r'https://bigskyquarry\.com/wp-content/[^\s"\'\\<>)]+')
for dp,_,fns in os.walk("mirror"):
    for fn in fns:
        if not fn.endswith(".html"): continue
        t=open(os.path.join(dp,fn),encoding="utf-8",errors="replace").read()
        for m in pat.findall(t):
            m=m.replace("&#038;","&").replace("&amp;","&")
            urls.add(m)
urls={u for u in urls if not u.endswith(",")}
open("assets.txt","w").write("\n".join(sorted(urls)))
print(len(urls),"asset urls")
from collections import Counter
c=Counter(os.path.splitext(u.split("?")[0])[1].lower() for u in urls)
for k,v in c.most_common(): print(f"  {k or '(none)'}: {v}")
