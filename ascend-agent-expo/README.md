# Ascend Agent Expo - Event Landing Page Template

A high-conversion, premium event landing page template designed for real estate conferences and professional events. Built with modern web standards, accessibility in mind, and optimized for conversions.

## 🚀 Features

### Design & UX
- **Premium Aesthetic**: Modern, clean design inspired by award-winning event sites
- **High Conversion Focus**: Strategic CTA placement and clear value propositions
- **Visual Hierarchy**: Strong typography and layout that guides user attention
- **Subtle Animations**: Smooth transitions and micro-interactions for engagement
- **Responsive Design**: Optimized for all devices from mobile to desktop

### Functionality
- **Interactive Countdown**: Real-time countdown to early bird deadline
- **Accordion FAQ**: Expandable Q&A section with keyboard navigation
- **Smooth Scrolling**: Enhanced navigation experience
- **Mobile Navigation**: Responsive hamburger menu for mobile devices
- **Newsletter Signup**: Email capture for marketing follow-up
- **Dynamic Content**: JavaScript-powered content rendering

### Performance & Accessibility
- **Fast Loading**: Optimized images, fonts, and assets
- **SEO Ready**: Semantic HTML and meta tags
- **Accessible**: WCAG compliant with keyboard navigation
- **Print Friendly**: Optimized print styles
- **Cross-browser**: Compatible with all modern browsers

## 📁 File Structure

```
ascend-agent-expo/
├── index.html          # Main HTML structure
├── styles.css          # Complete CSS styling
├── script.js           # JavaScript functionality & data
└── README.md           # This documentation
```

## 🎯 Page Sections

1. **Hero Section**
   - Event name, date, location
   - Value proposition and tagline
   - Primary/secondary CTAs
   - Early-bird and limited seats badges
   - Live countdown timer

2. **Sponsors Section**
   - Tiered sponsor logos (Platinum, Gold, Silver)
   - "Become a Sponsor" CTA
   - Hover effects and branding

3. **Why Attend Section**
   - Three core value pillars
   - Icon-based visual design
   - Compelling benefit descriptions

4. **Tickets & Pricing**
   - Multiple ticket tiers with pricing
   - Feature comparison lists
   - Price countdown timer
   - Strong purchase CTAs

5. **Venue & Travel**
   - Venue information and map
   - Travel tips and directions
   - Partner hotel listings
   - Booking assistance CTA

6. **Presenting Sponsors**
   - Detailed sponsor spotlights
   - Logos, descriptions, and links
   - Premium placement and styling

7. **FAQ Section**
   - Expandable accordion interface
   - Common questions and policies
   - Accessibility-friendly navigation

8. **Final CTA Band**
   - Last-chance conversion opportunity
   - Multiple action buttons
   - Newsletter signup form

## 🛠️ Customization Guide

### Quick Start
1. Open `script.js` and locate the `eventData` object
2. Update the event details, dates, and content
3. Replace placeholder images with your assets
4. Customize colors in the CSS variables (if needed)

### Data Structure

The entire page content is driven by the `eventData` object in `script.js`:

```javascript
const eventData = {
    event: {
        name: "Your Event Name",
        dates: "March 15-17, 2025",
        location: "Your Venue",
        tagline: "Your Value Proposition",
        earlyBirdDeadline: "2025-02-15T23:59:59"
    },
    sponsors: [
        {
            name: "Sponsor Name",
            logo: "path/to/logo.png",
            tier: "platinum|gold|silver",
            link: "https://sponsor-website.com"
        }
    ],
    // ... more sections
};
```

### Updating Content

#### Event Information
```javascript
event: {
    name: "Your Conference Name",
    dates: "Your Event Dates",
    location: "Your Venue Name",
    tagline: "Your Marketing Message",
    earlyBirdDeadline: "YYYY-MM-DDTHH:MM:SS" // ISO format
}
```

#### Sponsors
```javascript
sponsors: [
    {
        name: "Company Name",
        logo: "https://example.com/logo.png", // 200x80px recommended
        tier: "platinum", // platinum, gold, or silver
        link: "https://company-website.com"
    }
]
```

#### Ticket Tiers
```javascript
tickets: [
    {
        tier: "Ticket Name",
        price: "$299",
        originalPrice: "$499", // Optional for strikethrough
        perks: ["Benefit 1", "Benefit 2", "Benefit 3"],
        featured: true, // Highlights this ticket
        available: true
    }
]
```

#### FAQ Items
```javascript
faq: [
    {
        question: "Your question here?",
        answer: "Detailed answer with all necessary information."
    }
]
```

### Styling Customization

#### Brand Colors
Update the gradient colors in `styles.css`:

```css
/* Primary gradient */
background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);

/* Secondary gradient */
background: linear-gradient(135deg, #YOUR_COLOR_3 0%, #YOUR_COLOR_4 100%);
```

#### Typography
The template uses Inter font. To change:

```css
body {
    font-family: 'YourFont', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

#### Logo/Branding
Replace the text logo in the navigation:

```html
<div class="nav-logo">
    <img src="your-logo.png" alt="Your Event" height="40">
</div>
```

## 🎨 Color Scheme

The template uses a sophisticated gradient-based color palette:

- **Primary**: `#667eea` to `#764ba2` (Purple gradient)
- **Secondary**: `#f093fb` to `#f5576c` (Pink gradient)
- **Accent**: `#4facfe` to `#43e97b` (Blue to green)
- **Neutral**: Grays from `#1a1a1a` to `#f8fafc`

## 📱 Responsive Breakpoints

- **Desktop**: 1024px and up
- **Tablet**: 768px to 1023px
- **Mobile**: 767px and below
- **Small Mobile**: 480px and below

## ⚡ Performance Features

- **Lazy Loading**: Images load as they enter viewport
- **Font Preloading**: Critical fonts preloaded for faster rendering
- **Optimized Assets**: Compressed images and minified code
- **Efficient Animations**: CSS transforms for smooth performance

## ♿ Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Visible focus indicators and logical tab order
- **High Contrast**: Support for high contrast mode
- **Reduced Motion**: Respects user's motion preferences
- **Skip Links**: Quick navigation for screen reader users

## 🔧 Browser Support

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+

## 📈 Conversion Optimization

### CTA Strategy
- **Primary CTAs**: "Get Tickets" - appears 4 times throughout the page
- **Secondary CTAs**: "See Sponsors", "Download Agenda", "Book Hotel"
- **Urgency Elements**: Countdown timers and limited availability badges
- **Social Proof**: Sponsor logos and testimonials

### User Journey
1. **Attention**: Hero section with strong value proposition
2. **Interest**: Why Attend section builds desire
3. **Consideration**: Tickets section with clear pricing
4. **Action**: Multiple conversion opportunities
5. **Retention**: Newsletter signup and follow-up

## 🚀 Deployment

### Static Hosting
Upload all files to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Traditional web hosting

### CDN Integration
For better performance, serve assets through a CDN:
- Images: Upload to Cloudinary or similar
- Fonts: Use Google Fonts CDN (already implemented)

## 🔄 Future Updates

To update for next year's event:

1. **Update dates** in `eventData.event`
2. **Replace sponsor logos** and information
3. **Update ticket prices** and perks
4. **Refresh FAQ** content
5. **Update venue** information if changed
6. **Test all functionality** before launch

## 📞 Support

For questions about implementation or customization:
- Review the code comments for guidance
- Test thoroughly on multiple devices
- Validate HTML and CSS before deployment
- Run accessibility audits using browser dev tools

## 📄 License

This template is provided as-is for commercial and personal use. Feel free to modify and customize for your events.

---

**Built with ❤️ for the real estate community**
