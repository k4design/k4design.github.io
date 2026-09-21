import os,re,json,sys

SRC="mirror"; DST="site"
ROOT="https://bigskyquarry.com"
ig=json.load(open("ig_map.json"))
REDIR=[tuple(l.rstrip("\n").split("\t")) for l in open("redirects.txt") if l.strip()]

# regions kept ABSOLUTE (canonical / social / structured data)
PROTECT=re.compile(
  r'(<link[^>]+rel=["\']canonical["\'][^>]*>'
  r'|<meta[^>]+(?:property|name)=["\'](?:og:|twitter:|msapplication)[^"\']*["\'][^>]*>'
  r'|<script[^>]+type=["\']application/ld\+json["\'][^>]*>.*?</script>)', re.S|re.I)

# WP cruft to delete outright
STRIP=[
 re.compile(r'<link[^>]+rel=["\'](?:EditURI|wlwmanifest|alternate|https://api\.w\.org/|shortlink|pingback)["\'][^>]*>',re.I),
 re.compile(r'<link[^>]+type=["\']application/(?:rsd\+xml|wlwmanifest\+xml|json\+oembed|xml\+oembed|rss\+xml|atom\+xml)["\'][^>]*>',re.I),
 re.compile(r'<meta name=["\']generator["\'][^>]*>',re.I),
]

def relprefix(rel):
    d=rel.count("/")
    return "../"*d if d else ""

def rewrite(text, rel):
    pre=relprefix(rel)
    # mask protected regions
    keep=[]
    def mask(m):
        keep.append(m.group(0)); return f"\x00{len(keep)-1}\x00"
    text=PROTECT.sub(mask,text)

    for p in STRIP: text=p.sub("",text)

    # resolve live-site 301s so no link depends on a redirect
    for src,dstu in REDIR:
        text=text.replace(src,dstu)

    # instagram cdn -> local
    for u,name in ig.items():
        local=pre+"wp-content/uploads/sb-instagram-feed-images/"+name
        text=text.replace(u,local).replace(u.replace("&","&#038;"),local).replace(u.replace("&","&amp;"),local)

    # assets: absolute & root-relative -> relative
    text=re.sub(r'https://bigskyquarry\.com/(wp-content|wp-includes)/', lambda m: pre+m.group(1)+"/", text)
    text=re.sub(r'(?<=[\"\'\s(,])/(wp-content|wp-includes)/', lambda m: pre+m.group(1)+"/", text)

    # typekit -> local (after asset pass, so it is not re-prefixed)
    tk=pre+"wp-content/themes/bigskyquarry/assets/fonts/typekit/typekit.css"
    text=re.sub(r'https://use\.typekit\.net/xga3pog\.css',tk,text)

    # internal pages -> relative
    def page(m):
        path=m.group(1)  # e.g. "vision/" or ""
        return (pre+path) if (pre+path) else "./"
    text=re.sub(r'https://bigskyquarry\.com/((?:[a-z0-9_-]+/)*)(?=["\'#?])', page, text)


    # static form handler on pages carrying a Gravity Form
    if "gform_wrapper" in text:
        tag=f'<script src="{pre}static-assets/static-form.js"></script>\n</body>'
        text=text.replace("</body>",tag,1)

    # unmask
    text=re.sub(r'\x00(\d+)\x00', lambda m: keep[int(m.group(1))], text)
    return text

n=0
for dp,_,fns in os.walk(SRC):
    for fn in fns:
        full=os.path.join(dp,fn); rel=os.path.relpath(full,SRC).replace(os.sep,"/")
        out=os.path.join(DST,rel); os.makedirs(os.path.dirname(out),exist_ok=True)
        if fn.endswith(".html"):
            t=open(full,encoding="utf-8",errors="replace").read()
            open(out,"w",encoding="utf-8").write(rewrite(t,rel)); n+=1
        else:
            if not os.path.exists(out):
                os.link(full,out) if True else None
print("rewrote",n,"html files")
