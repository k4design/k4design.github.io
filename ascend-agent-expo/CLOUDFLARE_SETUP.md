# Cloudflare Setup & Troubleshooting Guide

## Common Issues with Form Submission on Cloudflare

When hosting through Cloudflare, the ActiveCampaign form may fail due to several Cloudflare features. Here's how to fix them:

---

## 1. **Rocket Loader Interference** ⚡

**Problem:** Cloudflare's Rocket Loader can break the JSONP form submission script.

**Solution:**
1. Go to Cloudflare Dashboard → Speed → Optimization
2. Scroll to **Rocket Loader**
3. Turn it **OFF**, or
4. Add this to your HTML `<head>`:
```html
<script data-cfasync="false" src="script.js"></script>
```

---

## 2. **Auto Minify Breaking Scripts** 📦

**Problem:** Cloudflare's Auto Minify can corrupt the inline form JavaScript.

**Solution:**
1. Go to Cloudflare Dashboard → Speed → Optimization
2. Under **Auto Minify**, uncheck **JavaScript**
3. Keep HTML and CSS minification enabled (they're safe)

---

## 3. **Bot Fight Mode Blocking Submissions** 🤖

**Problem:** Cloudflare's Bot Fight Mode might block the ActiveCampaign endpoint.

**Solution:**
1. Go to Cloudflare Dashboard → Security → Bots
2. Disable **Bot Fight Mode**, or
3. Add a **Page Rule** to bypass security for the form:
   - URL pattern: `*yourdomain.com/*`
   - Setting: **Security Level** → Essentially Off (for the ActiveCampaign domain)

---

## 4. **Content Security Policy (CSP)** 🔒

**Problem:** If you've set up CSP headers, they might block external scripts.

**Solution:**
Add these domains to your CSP policy in Cloudflare → Security → Transform Rules:

```
Content-Security-Policy: 
  script-src 'self' 'unsafe-inline' 'unsafe-eval' 
    https://robertpalmercompanies.activehosted.com 
    https://fonts.googleapis.com 
    https://cdnjs.cloudflare.com;
  connect-src 'self' 
    https://robertpalmercompanies.activehosted.com;
```

---

## 5. **Browser Integrity Check** 🔍

**Problem:** Strict browser checks can interfere with JSONP requests.

**Solution:**
1. Go to Cloudflare Dashboard → Security → Settings
2. Turn **Browser Integrity Check** to **Off** (or Low)

---

## 6. **Ad Blockers & Privacy Extensions** 🛡️

**Problem:** User's browser extensions might block ActiveCampaign requests.

**Solution:**
- This is user-side, but you can add a fallback message
- Or use a Cloudflare Worker to proxy the form submission (advanced)

---

## Recommended Cloudflare Settings for This Site

### ✅ Keep These ON:
- Auto Minify (HTML, CSS only - NOT JavaScript)
- Brotli Compression
- HTTP/2
- HTTP/3 with QUIC
- Early Hints
- Image Optimization

### ⚠️ Turn These OFF:
- Rocket Loader
- JavaScript Minification (Auto Minify)
- Bot Fight Mode (or add exceptions)
- Browser Integrity Check (set to Low)

---

## Testing the Form

### Local Testing
```bash
# The form will automatically detect localhost and show test mode
python3 -m http.server 8000
# Visit http://localhost:8000 and check browser console
```

### Production Testing
1. Open your site hosted on Cloudflare
2. Open Browser DevTools (F12 or Cmd+Option+I)
3. Go to the **Console** tab
4. Submit the form
5. Look for these messages:
   - ✅ `🌐 PRODUCTION MODE: Submitting to ActiveCampaign`
   - ✅ `Using JSONP submission method`
   - ✅ `JSONP URL length: ...`

### Common Error Messages

**"Script failed to load"**
- Check Rocket Loader and Auto Minify settings
- Check if ad blockers are enabled

**"Form submission timed out"**
- Check Bot Fight Mode
- Check Browser Integrity Check
- Verify ActiveCampaign endpoint is accessible

**"Sorry, your submission failed"**
- Check browser console for detailed error
- Verify ActiveCampaign form ID (24) is correct
- Check CSP headers aren't blocking the request

---

## Alternative: Use Cloudflare Workers

If you continue to have issues, you can proxy form submissions through a Cloudflare Worker:

### Create Worker `form-proxy.js`:
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  
  const formData = await request.formData()
  
  // Forward to ActiveCampaign
  const acUrl = 'https://robertpalmercompanies.activehosted.com/proc.php'
  const response = await fetch(acUrl, {
    method: 'POST',
    body: formData
  })
  
  return new Response(await response.text(), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    }
  })
}
```

Then update the form in `index.html` to submit to your worker instead of directly to ActiveCampaign.

---

## Verifying It Works

### Success Indicators:
1. Form submits without errors
2. Thank you message appears
3. Email appears in ActiveCampaign dashboard
4. Browser console shows no errors

### Need More Help?

Check the browser console logs - the form now includes detailed debugging information:
- Development mode detection
- Submission method (JSONP/POST)
- URL being called
- Error details with stack traces

---

## Quick Fix Checklist

When deploying to Cloudflare, do this:

- [ ] Turn OFF Rocket Loader
- [ ] Disable JavaScript Auto Minify
- [ ] Set Bot Fight Mode to OFF or Low
- [ ] Set Browser Integrity Check to OFF or Low
- [ ] Clear Cloudflare cache after making changes
- [ ] Test form submission with browser console open
- [ ] Check for ad blockers in test browser

---

**After making these changes, always purge your Cloudflare cache:**

Dashboard → Caching → Purge Everything

Then test the form again!

