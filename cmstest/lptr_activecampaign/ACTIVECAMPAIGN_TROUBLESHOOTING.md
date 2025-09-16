# ActiveCampaign Styling Troubleshooting Guide

## Common Issues and Solutions

### 1. **Fonts Not Loading**
**Problem:** Poppins font not appearing in ActiveCampaign preview
**Solutions:**
- Ensure the font links are in the HEAD section (not body)
- Check if ActiveCampaign blocks external font loading
- Try using system fonts as fallback: `font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;`

### 2. **CSS Not Applying**
**Problem:** Styles from your custom CSS not showing up
**Solutions:**
- Use `!important` declarations to override ActiveCampaign's default styles
- Check if ActiveCampaign has CSS restrictions
- Ensure CSS is in the HEAD section, not body

### 3. **Layout Breaking**
**Problem:** Grid layouts or responsive design not working
**Solutions:**
- Use explicit pixel values instead of `clamp()` if needed
- Add `!important` to all CSS properties
- Test with simpler CSS first, then add complexity

### 4. **Colors Not Showing**
**Problem:** Custom colors not appearing
**Solutions:**
- Use hex codes instead of CSS variables
- Add `!important` to color properties
- Check for ActiveCampaign color overrides

## Step-by-Step Debugging

### Step 1: Test Font Loading
1. Copy the HEAD_SNIPPET_AC.html content to ActiveCampaign head
2. Preview the page
3. Check if Poppins font loads (inspect element to see computed font-family)
4. If not, try the system font fallback version

### Step 2: Test Basic Styling
1. Start with just the hero section
2. Add one section at a time
3. Check each section in preview before adding the next

### Step 3: Check for Conflicts
1. Look for ActiveCampaign's default CSS that might be overriding yours
2. Use browser dev tools to inspect elements
3. Check if your CSS is being applied (look for strikethrough in dev tools)

## Alternative Approaches

### Option 1: Use System Fonts Only
If Google Fonts don't work, use this font stack:
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
```

### Option 2: Inline Critical Styles
For the most important elements, use inline styles:
```html
<h1 style="font-family: 'Poppins', Arial, sans-serif !important; font-size: 2rem !important; color: white !important;">
```

### Option 3: Simplified CSS
Use a more basic CSS approach without advanced features:
- Remove CSS Grid, use Flexbox or basic block layout
- Use fixed pixel values instead of responsive units
- Simplify color schemes

## Testing Checklist

- [ ] Fonts load correctly
- [ ] Colors display properly
- [ ] Layout is responsive
- [ ] Buttons are clickable
- [ ] Text is readable
- [ ] Images display (if any)
- [ ] Animations work (if any)

## Contact ActiveCampaign Support

If issues persist, contact ActiveCampaign support with:
1. Screenshots of the preview vs expected result
2. Your custom CSS code
3. Browser and device information
4. Specific error messages (if any)

## Backup Plan

If ActiveCampaign continues to have issues, consider:
1. Using their built-in page builder with custom CSS
2. Creating a simpler version with basic HTML/CSS
3. Using a different landing page platform
4. Hosting the page externally and linking to it
