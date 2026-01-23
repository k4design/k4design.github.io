# Real Estate Data Collector Web Application

A web application for collecting property data and images for the Real Estate Autofill Figma plugin. This application allows users to submit property information through forms and upload images, which are then packaged into zip files that designers can download.

## Features

- **Property Data Form**: Comprehensive form for entering property details including:
  - Property details (bedrooms, bathrooms, square feet, price)
  - Address information
  - Property description and tagline
  - Up to 6 features
  - Agent information

- **Image Upload**: 
  - Upload up to 10 images per property
  - Drag and drop support
  - Image preview before submission
  - Automatic renaming for plugin compatibility

- **Automatic ZIP Creation**: 
  - Creates a zip file containing:
    - `property_data.csv` with all property information
    - Renamed images (with `_1`, `_2`, etc. suffixes)

- **Designer Admin Panel**: 
  - View all submitted properties
  - Download zip files
  - Delete submissions
  - Auto-refresh every 30 seconds

## Installation

1. Navigate to the web directory:
```bash
cd web
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

1. **Submit Property Data**: 
   - Visit `http://localhost:3000`
   - Fill out the property information form
   - Upload up to 10 images
   - Click "Submit Property Data"

2. **Access Designer Panel**: 
   - Visit `http://localhost:3000/admin.html`
   - View all submitted properties
   - Download zip files for use with the Figma plugin
   - Delete submissions when no longer needed

## File Structure

- `server.js` - Express server with API endpoints
- `public/index.html` - Main submission form
- `public/admin.html` - Designer admin panel
- `public/styles.css` - Styling for all pages
- `public/script.js` - Frontend JavaScript for form
- `public/admin.js` - Frontend JavaScript for admin panel
- `uploads/` - Temporary storage for uploaded images (auto-cleaned)
- `zips/` - Generated zip files
- `submissions.db` - SQLite database for submission tracking

## API Endpoints

- `POST /api/submit` - Submit property data and images
- `GET /api/submissions` - Get all submissions (for admin panel)
- `GET /api/download/:filename` - Download a zip file
- `DELETE /api/submissions/:id` - Delete a submission

## Notes

- Images are automatically renamed with `_1` through `_10` suffixes before the file extension
- CSV file follows the same format as `property_data_template.csv`
- All uploaded files are cleaned up after zip creation
- The database stores submission metadata for the admin panel
