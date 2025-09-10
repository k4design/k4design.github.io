# Aperture Global Website - Node.js Server

This is the Node.js server setup for the Aperture Global luxury real estate website.

## Prerequisites

- Node.js (version 14.0.0 or higher)
- npm (comes with Node.js)

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Server

### Development Mode
```bash
npm run dev
```
This will start the server with nodemon for automatic restarts when files change.

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` by default.

## Environment Variables

You can set the following environment variables:

- `PORT`: Port number (default: 3000)
- `NODE_ENV`: Environment (development/production)

Example:
```bash
PORT=8080 NODE_ENV=production npm start
```

## Features

- **Static File Serving**: Serves all HTML, CSS, JS, and image files
- **API Endpoints**: 
  - `POST /api/contact` - Contact form submissions
  - `POST /api/schedule-tour` - Tour scheduling
  - `POST /api/newsletter` - Newsletter signups
  - `GET /api/properties` - Property data (placeholder)
- **Security**: Helmet.js for security headers
- **Compression**: Gzip compression for better performance
- **CORS**: Cross-origin resource sharing enabled
- **Error Handling**: Graceful error handling and logging

## File Structure

```
apertureidx/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── index.html             # Homepage
├── about.html             # About page
├── agents.html            # Agents listing
├── properties.html        # Properties listing
├── new-developments.html  # New developments
├── property-*.html        # Individual property pages
├── agent-*.html           # Individual agent pages
├── includes/              # Shared components
│   ├── nav.html
│   ├── footer.html
│   └── load-includes.js
├── img/                   # Images
├── styles.css             # Main stylesheet
└── script.js              # Main JavaScript
```

## API Usage

### Contact Form
```javascript
fetch('/api/contact', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    message: 'Interested in property',
    propertyId: 123
  })
});
```

### Schedule Tour
```javascript
fetch('/api/schedule-tour', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    propertyTitle: 'Luxury Penthouse',
    propertyLocation: 'Manhattan, NY',
    date: '2024-01-15',
    time: '2:00 PM',
    contact: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890'
    }
  })
});
```

## Development

The server includes:
- Automatic file watching with nodemon
- CORS enabled for development
- Detailed error logging
- Security headers for production

## Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up reverse proxy with Nginx
4. Configure SSL certificates

Example PM2 configuration:
```json
{
  "apps": [{
    "name": "aperture-global",
    "script": "server.js",
    "instances": "max",
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "production",
      "PORT": 3000
    }
  }]
}
```

## Troubleshooting

- **Port already in use**: Change the PORT environment variable
- **Files not loading**: Check file paths and permissions
- **API errors**: Check server logs for detailed error messages

## Support

For issues or questions, please check the server logs and ensure all dependencies are properly installed.
