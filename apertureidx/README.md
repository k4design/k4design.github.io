# Aperture Global - International Luxury Real Estate Website

A modern, responsive website for Aperture Global international luxury real estate brokerage, featuring an integrated global IDX MLS feed while maintaining the original sophisticated design.

## Features

### 🌍 **International IDX MLS Integration**
- Dynamic property listings from global MLS feeds
- Advanced search and filtering by country/region and location
- International property coverage spanning 6 continents
- Property details modal with comprehensive information
- Load more functionality for large property sets
- Responsive property grid layout with country badges

### 🎨 **Original Design Preservation**
- Maintains the luxury aesthetic of the original Aperture Global website
- Sophisticated color scheme with brown/gold accents (#8B4513)
- Premium typography using Playfair Display and Inter fonts
- Smooth animations and hover effects
- Professional layout with proper spacing and hierarchy

### 📱 **Responsive Design**
- Mobile-first approach
- Optimized for all device sizes
- Touch-friendly navigation
- Adaptive grid layouts
- Mobile menu functionality

### ⚡ **Interactive Features**
- Smooth scrolling navigation
- Property search and filtering
- Modal property details
- Contact integration
- Loading states and error handling

## File Structure

```
aperture-global-website/
├── index.html          # Main HTML structure
├── styles.css          # CSS styling and responsive design
├── script.js           # JavaScript functionality and MLS integration
└── README.md           # This file
```

## Getting Started

1. **Clone or download** the website files
2. **Open `index.html`** in a web browser
3. **No server required** - runs entirely in the browser

## IDX MLS Integration

The website includes a comprehensive MLS integration system:

### Current Implementation
- **International Mock Data**: Currently uses simulated global MLS data for demonstration
- **Advanced Search Filters**: Country/region, location, price range, and property type filtering
- **Global Property Display**: Grid layout with images, prices, country badges, and details
- **Modal Details**: Click any property to view detailed information
- **22 International Properties**: Covering USA, Caribbean, Europe, Asia, and Middle East

### Real International IDX Integration
To connect to real international MLS systems, replace the `fetchMLSProperties()` method in `script.js` with your global IDX API calls:

```javascript
async fetchMLSProperties() {
    // Replace with your IDX API endpoint
    const response = await fetch('YOUR_IDX_API_ENDPOINT', {
        headers: {
            'Authorization': 'Bearer YOUR_API_KEY',
            'Content-Type': 'application/json'
        }
    });
    
    const data = await response.json();
    return data.properties; // Adjust based on your API response structure
}
```

### Popular International IDX Providers
- **IDX Broker** (Global coverage)
- **WolfNet** (International MLS)
- **RETS/Spark API** (Multi-country support)
- **RentSpree** (Global rentals)
- **ShowingTime** (International showing management)
- **RE/MAX Global** (Worldwide network)
- **Coldwell Banker Global** (International presence)
- **Sotheby's International Realty** (Global luxury)

## Customization

### Colors
The main brand color is defined in CSS variables:
```css
:root {
    --primary-color: #8B4513;  /* Brown/Gold */
    --secondary-color: #654321; /* Darker brown */
}
```

### Content
- Update property data in `script.js`
- Modify company information in `index.html`
- Customize contact details in the footer

### Styling
- Adjust fonts in the Google Fonts import
- Modify spacing and layout in `styles.css`
- Add custom animations or effects

## Browser Support

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## Performance Features

- **Lazy Loading**: Images load as needed
- **Optimized Images**: Uses Unsplash with size parameters
- **Minimal Dependencies**: Only Google Fonts and Font Awesome
- **Efficient JavaScript**: Modern ES6+ features
- **CSS Grid**: Modern layout system for better performance

## SEO Considerations

- Semantic HTML structure
- Proper heading hierarchy
- Alt text for images
- Meta tags (add to `<head>` section)
- Schema markup ready (can be added)

## Future Enhancements

- [ ] Real IDX API integration
- [ ] Property comparison feature
- [ ] Advanced map integration
- [ ] Virtual tour embedding
- [ ] Lead capture forms
- [ ] Analytics integration
- [ ] Multi-language support
- [ ] Dark mode toggle

## Support

For questions about implementation or customization, refer to the code comments or contact the development team.

## License

This project is created for Aperture Global and follows their brand guidelines and design requirements.
