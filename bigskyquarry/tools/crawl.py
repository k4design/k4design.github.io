import re,html,urllib.request,urllib.parse as up,collections
UA={"User-Agent":"Mozilla/5.0 AppleWebKit/537.36 Chrome/120"}
ROOT="https://bigskyquarry.com"
start=[l.strip() for l in open("all_urls.txt") if l.strip()]
seen=set(); status={}; q=collections.deque(start)
href=re.compile(r'<a[^>]+href=["\']([^"\']+)["\']',re.I)
SKIP=re.compile(r'\.(jpg|jpeg|png|gif|webp|avif|svg|pdf|css|js|zip|ico)$|/wp-admin/|/wp-json/|/wp-content/|/feed/|xmlrpc|\?')
while q:
    u=q.popleft()
    if u in seen: continue
    seen.add(u)
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=45)
        final=r.geturl(); status[u]=(r.status,final)
        body=r.read().decode("utf-8","replace")
    except Exception as e:
        status[u]=(getattr(e,"code","ERR"),None); continue
    for h in href.findall(body):
        h=html.unescape(h).split("#")[0]
        if not h: continue
        a=up.urljoin(final,h)
        if not a.startswith(ROOT+"/"): continue
        if SKIP.search(a): continue
        if not a.endswith("/"): a+="/"
        if a not in seen: q.append(a)
print("crawled",len(seen))
redir={u:f for u,(c,f) in status.items() if f and f.rstrip("/")!=u.rstrip("/")}
print("\n=== REDIRECTS ===")
for u,f in sorted(redir.items()): print(" ",u.replace(ROOT,""),"->",f.replace(ROOT,""))
new=[u for u,(c,f) in status.items() if c==200 and u not in set(start) and u not in redir]
print("\n=== PAGES NOT IN SITEMAP (",len(new),") ===")
for u in sorted(new): print(" ",u.replace(ROOT,""))
bad={u:c for u,(c,f) in status.items() if c!=200}
print("\n=== NON-200 ===")
for u,c in sorted(bad.items()): print(" ",c,u.replace(ROOT,""))
open("extra_urls.txt","w").write("\n".join(sorted(new)))
open("redirects.txt","w").write("\n".join(f"{u}\t{f}" for u,f in sorted(redir.items())))
