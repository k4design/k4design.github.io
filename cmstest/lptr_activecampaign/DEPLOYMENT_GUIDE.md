# ActiveCampaign Landing Page Deployment Guide

## Overview
This project contains two landing pages for Listing Power Tools (LPT) that are designed to be deployed in ActiveCampaign's landing page builder. The pages follow ActiveCampaign's constraints of using only `<head>` and `<body>` fields with no external dependencies.

## Files Structure
```
lptr_activecampaign/
├── HEAD_SNIPPET.html    # CSS styles for <head> field
├── BODY_SNIPPET.html    # HTML markup and JS for <body> field
├── index.html           # Complete standalone page for testing
└── DEPLOYMENT_GUIDE.md  # This file
```

## Deployment Instructions

### Step 1: Access ActiveCampaign Landing Page Builder
1. Log into your ActiveCampaign account
2. Navigate to "Sites" → "Landing Pages"
3. Create a new landing page or edit an existing one

### Step 2: Configure Page Settings
1. Set page title: "Listing Power Tools - Break Out of the 1-2 Deal Rut"
2. Set meta description: "The $399/month system that changes everything for agents closing just 1-2 deals a year. Get the Magic White Box and transform your real estate business."
3. Set page URL slug: `listing-power-tools` (or your preferred slug)

### Step 3: Add Custom Code
1. **Head Field**: Copy the entire contents of `HEAD_SNIPPET.html` and paste into the "Custom Code" → "Head" field
2. **Body Field**: Copy the entire contents of `BODY_SNIPPET.html` and paste into the "Custom Code" → "Body" field

### Step 4: Configure CTAs
Update the CTA button links to point to your actual ActiveCampaign forms or external URLs:

- **Primary CTAs** (currently `#special-offer`): Update to scroll to special offer section or link to AC form
- **Final CTA** (currently `#join`): Update to your LPT Realty signup form or external join page

### Step 5: Set Up Analytics
The page includes `data-analytics` attributes on all CTAs. Configure your analytics tracking:

1. **Google Analytics**: Add tracking code to the head section
2. **ActiveCampaign Events**: Use the data attributes to track conversions
3. **Custom Events**: Update the JavaScript console.log statements with your tracking code

### Step 6: Test and Publish
1. Preview the page in ActiveCampaign's builder
2. Test on mobile and desktop devices
3. Verify all CTAs work correctly
4. Check that animations and interactions work properly
5. Publish the page

## Page Structure

### Primary Sales Page (Sections 1-10)
1. **Hero** - Main headline, subline, highlight ribbon, punchline, CTA
2. **The Problem** - Bullet points about why agents stay stuck
3. **Magic White Box Intro** - Core system explanation
4. **Confidence Shift** - Before/after transformation
5. **Hidden Cost of Inaction** - Urgency building
6. **Same Old, Same Old** - Pattern disruption
7. **Testimonials** - Social proof with 3 agent testimonials
8. **Future Self Contrast** - Two scenarios comparison
9. **Fork in the Road** - Final push with CTA
10. **What You Get** - Detailed benefits and final CTA

### Special Offer Page (Sections 11-15)
11. **Pattern Interrupt** - Free offer hook
12. **Why LPT Realty Exists** - Brokerage explanation
13. **The Comp Plan** - Commission structure details
14. **Join Now Bonus Stack** - Exclusive bonuses
15. **Final CTA** - Join LPT Realty call-to-action

## Technical Features

### Responsive Design
- Mobile-first approach with fluid typography using `clamp()`
- CSS Grid and Flexbox for layouts
- Breakpoints at 768px and 1024px
- Intrinsic image sizing

### Accessibility
- Semantic HTML structure with proper headings (h1-h3)
- Skip link for keyboard navigation
- Focus states for all interactive elements
- Reduced motion support
- WCAG AA contrast compliance

### Performance
- No external dependencies
- System fonts only
- Inline CSS and JavaScript
- Optimized animations with reduced motion support

### Analytics Integration
- Data attributes on all CTAs for event tracking
- Console logging for debugging
- Smooth scroll functionality
- Viewport reveal animations

## Customization Options

### Colors
Update CSS custom properties in `:root`:
```css
--bg-primary: #ffffff;
--bg-secondary: #f8fafc;
--bg-accent: #1e40af;
--text-primary: #1f2937;
--text-accent: #1e40af;
```

### Typography
All fonts use the system stack:
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Arial, sans-serif;
```

### CTAs
Update button links and analytics tracking as needed for your specific ActiveCampaign setup.

## Troubleshooting

### Common Issues
1. **Styling not applied**: Ensure CSS is in the `<head>` field, not `<body>`
2. **JavaScript not working**: Ensure JS is at the end of the `<body>` field
3. **CTAs not linking**: Update href attributes to point to correct forms/URLs
4. **Mobile layout issues**: Check that viewport meta tag is present

### Testing Checklist
- [ ] Page loads without external dependencies
- [ ] All CTAs link to correct destinations
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] Animations work smoothly
- [ ] Analytics tracking is configured
- [ ] Forms integrate with ActiveCampaign properly

## Support
For technical issues with the landing page code, refer to this deployment guide. For ActiveCampaign-specific issues, consult ActiveCampaign's documentation or support team.
