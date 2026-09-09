#!/usr/bin/env python3
"""Static file server with HTTP Range support (206) - Safari's media stack needs it."""
import os, re, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class H(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      '.mp4': 'video/mp4', '.webm': 'video/webm', '.svg': 'image/svg+xml', '.js': 'text/javascript'}
    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def send_head(self):
        rng = self.headers.get('Range')
        path = self.translate_path(self.path)
        if not rng or os.path.isdir(path) or not os.path.isfile(path):
            return super().send_head()
        m = re.match(r'bytes=(\d*)-(\d*)$', rng.strip())
        size = os.path.getsize(path)
        if not m:
            return super().send_head()
        start = int(m.group(1)) if m.group(1) else 0
        end = int(m.group(2)) if m.group(2) else size - 1
        end = min(end, size - 1)
        if start > end or start >= size:
            self.send_response(416); self.send_header('Content-Range', f'bytes */{size}'); self.end_headers(); return None
        f = open(path, 'rb'); f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        self._range_len = end - start + 1
        return f
    def copyfile(self, src, dst):
        n = getattr(self, '_range_len', None)
        if n is None: return super().copyfile(src, dst)
        while n > 0:
            chunk = src.read(min(64 * 1024, n))
            if not chunk: break
            dst.write(chunk); n -= len(chunk)
    # POST /_upload?name=<file> : the page hands us a blob (used to save a canvas frame to disk)
    def do_POST(self):
        import urllib.parse
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = os.path.basename(q.get('name', [''])[0])
        if self.path.split('?')[0] != '/_upload' or not name:
            self.send_response(404); self.end_headers(); return
        n = int(self.headers.get('Content-Length', 0))
        data = self.rfile.read(n)
        with open(os.path.join(os.getcwd(), name), 'wb') as f: f.write(data)
        self.send_response(200); self.send_header('Content-Type', 'text/plain'); self.end_headers()
        self.wfile.write(f"saved {name} {len(data)} bytes".encode())
    def log_message(self, fmt, *args):
        with open(sys.argv[2], 'a') as log: log.write("%s - %s\n" % (self.address_string(), fmt % args))

os.chdir(sys.argv[1])
ThreadingHTTPServer(('127.0.0.1', int(sys.argv[3]) if len(sys.argv)>3 else 8799), H).serve_forever()
