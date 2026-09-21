import os,re,html,posixpath
from collections import Counter
SITE="site"
attr=re.compile(r'(?:href|src|data-src|action)=["\']([^"\']+)["\']')
srcset=re.compile(r'(?:srcset|data-srcset)=["\']([^"\']+)["\']')
missing=Counter(); total=0; examples={}
for dp,_,fns in os.walk(SITE):
    for fn in fns:
        if not fn.endswith(".html"): continue
        full=os.path.join(dp,fn); reldir=os.path.relpath(dp,SITE)
        t=open(full,encoding="utf-8",errors="replace").read()
        cands=list(attr.findall(t))
        for ss in srcset.findall(t):
            for part in ss.split(","):
                p=part.strip().split(" ")[0]
                if p: cands.append(p)
        for u in cands:
            u=html.unescape(u).strip()
            if not u or u.startswith(("http://","https://","//","data:","mailto:","tel:","#","javascript:","about:")): continue
            path=u.split("#")[0].split("?")[0]
            if not path: continue
            if path.startswith("/"):
                target=posixpath.normpath(path.lstrip("/"))
            else:
                target=posixpath.normpath(posixpath.join(reldir.replace(os.sep,"/") if reldir!="." else "", path))
            total+=1
            fp=os.path.join(SITE,target)
            if os.path.isdir(fp): fp=os.path.join(fp,"index.html")
            if not os.path.exists(fp):
                missing[target]+=1; examples.setdefault(target,f"{os.path.relpath(full,SITE)} -> {u}")
print(f"checked {total} local refs; {sum(missing.values())} broken across {len(missing)} targets")
for k,v in missing.most_common(30): print(f"  {v:>4}  {k}   e.g. {examples[k]}")
