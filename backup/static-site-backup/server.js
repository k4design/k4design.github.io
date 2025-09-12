const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://api.bigdatacloud.net"],
    },
  },
}));

// Enable CORS for all routes
app.use(cors());

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname)));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Property pages
app.get('/property-:property', (req, res) => {
  const property = req.params.property;
  const propertyFile = `property-${property}.html`;
  res.sendFile(path.join(__dirname, propertyFile));
});

// Agent pages
app.get('/agent-:agent', (req, res) => {
  const agent = req.params.agent;
  const agentFile = `agent-${agent}.html`;
  res.sendFile(path.join(__dirname, agentFile));
});

// New development pages
app.get('/new-development-:development', (req, res) => {
  const development = req.params.development;
  const developmentFile = `new-development-${development}.html`;
  res.sendFile(path.join(__dirname, developmentFile));
});

// API routes for property data (if needed)
app.get('/api/properties', (req, res) => {
  // This would typically connect to a database or MLS API
  res.json({
    message: 'Properties API endpoint',
    properties: []
  });
});

// API route for contact form submissions
app.post('/api/contact', (req, res) => {
  const { name, email, phone, message, propertyId } = req.body;
  
  // Here you would typically save to database or send email
  console.log('Contact form submission:', { name, email, phone, message, propertyId });
  
  res.json({
    success: true,
    message: 'Thank you for your inquiry. We will contact you soon.'
  });
});

// API route for tour scheduling
app.post('/api/schedule-tour', (req, res) => {
  const { propertyTitle, propertyLocation, date, time, contact } = req.body;
  
  // Here you would typically save to database or send email
  console.log('Tour scheduled:', { propertyTitle, propertyLocation, date, time, contact });
  
  res.json({
    success: true,
    message: 'Tour request submitted successfully! We will contact you soon to confirm.'
  });
});

// Newsletter signup
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;
  
  // Here you would typically save to database
  console.log('Newsletter signup:', { email });
  
  res.json({
    success: true,
    message: 'Successfully subscribed to our newsletter!'
  });
});

// Catch-all handler for SPA routing (if needed)
app.get('*', (req, res) => {
  // Check if the requested file exists
  const filePath = path.join(__dirname, req.path);
  const fs = require('fs');
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.sendFile(filePath);
  } else {
    // For any other route, serve the main index.html
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Aperture Global website is running on http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
