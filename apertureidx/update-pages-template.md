# Template for Updating Remaining Pages

For each remaining page (agents.html, property-*.html), make these changes:

## 1. Add to <head> section:
```html
<script src="includes/load-includes.js"></script>
```

## 2. Add data-page attribute to <body>:
- agents.html: `<body data-page="agents">`
- property-manhattan-penthouse.html: `<body data-page="property">`
- property-beverly-hills-estate.html: `<body data-page="property">`
- property-monaco-villa.html: `<body data-page="property">`

## 3. Replace navigation with:
```html
<!-- Navigation Placeholder -->
<div id="nav-placeholder"></div>
```

## 4. Replace footer with:
```html
<!-- Footer Placeholder -->
<div id="footer-placeholder"></div>
```

## Benefits:
- Single source of truth for navigation and footer
- Easy to update across all pages
- Consistent branding and functionality
- Reduced maintenance overhead
