#!/usr/bin/env python3
"""
Simple HTTP server for Aperture Global website
Alternative to Node.js server for development
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse, parse_qs
import json

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests for API endpoints"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError:
            data = {}
        
        # Parse the URL path
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Handle different API endpoints
        if path == '/api/contact':
            self.handle_contact_form(data)
        elif path == '/api/schedule-tour':
            self.handle_schedule_tour(data)
        elif path == '/api/newsletter':
            self.handle_newsletter(data)
        else:
            self.send_error(404, "API endpoint not found")
    
    def handle_contact_form(self, data):
        """Handle contact form submissions"""
        print(f"Contact form submission: {data}")
        response = {
            "success": True,
            "message": "Thank you for your inquiry. We will contact you soon."
        }
        self.send_json_response(response)
    
    def handle_schedule_tour(self, data):
        """Handle tour scheduling"""
        print(f"Tour scheduled: {data}")
        response = {
            "success": True,
            "message": "Tour request submitted successfully! We will contact you soon to confirm."
        }
        self.send_json_response(response)
    
    def handle_newsletter(self, data):
        """Handle newsletter signups"""
        print(f"Newsletter signup: {data}")
        response = {
            "success": True,
            "message": "Successfully subscribed to our newsletter!"
        }
        self.send_json_response(response)
    
    def send_json_response(self, data):
        """Send JSON response"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def end_headers(self):
        """Add CORS headers to all responses"""
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

def main():
    PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    
    # Change to the directory containing the website files
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"🚀 Aperture Global website is running on http://localhost:{PORT}")
        print(f"📁 Serving files from: {os.getcwd()}")
        print("Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")

if __name__ == "__main__":
    main()
