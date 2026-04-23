const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Ensure directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const zipsDir = path.join(__dirname, 'zips');
const dbPath = path.join(__dirname, 'submissions.db');

[uploadsDir, zipsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    db.run(`CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_name TEXT,
      bedrooms TEXT,
      bathrooms TEXT,
      sqft TEXT,
      price TEXT,
      street TEXT,
      street2 TEXT,
      cityState TEXT,
      tagline TEXT,
      description TEXT,
      headline TEXT,
      disclaimer TEXT,
      feature1 TEXT,
      feature2 TEXT,
      feature3 TEXT,
      feature4 TEXT,
      feature5 TEXT,
      feature6 TEXT,
      name TEXT,
      agentTitle TEXT,
      phone TEXT,
      email TEXT,
      zip_filename TEXT,
      completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating table:', err);
      } else {
        // Add headline and disclaimer columns if they don't exist (for existing databases)
        db.run(`ALTER TABLE submissions ADD COLUMN headline TEXT`, () => {});
        db.run(`ALTER TABLE submissions ADD COLUMN disclaimer TEXT`, () => {});
        // Add completed columns if they don't exist
        db.run(`ALTER TABLE submissions ADD COLUMN completed INTEGER DEFAULT 0`, () => {});
        db.run(`ALTER TABLE submissions ADD COLUMN completed_at DATETIME`, () => {});
      }
    });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Preserve original filename for processing
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for ZIP files
});

// Helper function to create CSV row
function createCSVRow(data) {
  const fields = [
    'bedrooms', 'bathrooms', 'sqft', 'price', 'street', 'street2', 
    'cityState', 'tagline', 'description', 'headline', 'disclaimer', 'feature1', 'feature2', 
    'feature3', 'feature4', 'feature5', 'feature6', 'name', 
    'agentTitle', 'phone', 'email'
  ];
  
  return fields.map(field => {
    const value = data[field] || '';
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }).join(',');
}

// Helper function to rename images for plugin format
function renameImageForPlugin(originalName, index) {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  return `${baseName}_${index}${ext}`;
}

// Route: Submit property data and images
app.post('/api/submit', upload.array('images', 10), async (req, res) => {
  try {
    const formData = req.body;
    const files = req.files || [];

    // Validate exactly 10 images
    const imageFiles = files.filter(file => file.mimetype.startsWith('image/'));
    if (imageFiles.length !== 10) {
      // Clean up uploaded files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(400).json({ 
        success: false, 
        message: `Exactly 10 images are required. You provided ${imageFiles.length} image(s).` 
      });
    }

    // Create zip file
    const zip = new JSZip();
    
    // Add CSV file
    const csvHeader = 'bedrooms,bathrooms,sqft,price,street,street2,cityState,tagline,description,headline,disclaimer,feature1,feature2,feature3,feature4,feature5,feature6,name,agentTitle,phone,email\n';
    const csvRow = createCSVRow(formData);
    zip.file('property_data.csv', csvHeader + csvRow);

    // Process and add images (we know there are exactly 10)

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const fileData = fs.readFileSync(file.path);
      const renamedName = renameImageForPlugin(file.originalname, i + 1);
      zip.file(renamedName, fileData);
    }

    // Generate zip file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipFilename = `property_${Date.now()}_${formData.street?.replace(/\s+/g, '_') || 'listing'}.zip`;
    const zipPath = path.join(zipsDir, zipFilename);
    
    fs.writeFileSync(zipPath, zipBuffer);

    // Clean up uploaded files
    files.forEach(file => {
      fs.unlinkSync(file.path);
    });

    // Save to database
    const stmt = db.prepare(`INSERT INTO submissions (
      property_name, bedrooms, bathrooms, sqft, price, street, street2,
      cityState, tagline, description, headline, disclaimer, feature1, feature2, feature3,
      feature4, feature5, feature6, name, agentTitle, phone, email, zip_filename
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    stmt.run(
      formData.street || 'Untitled Property',
      formData.bedrooms || '',
      formData.bathrooms || '',
      formData.sqft || '',
      formData.price || '',
      formData.street || '',
      formData.street2 || '',
      formData.cityState || '',
      formData.tagline || '',
      formData.description || '',
      formData.headline || '',
      formData.disclaimer || '',
      formData.feature1 || '',
      formData.feature2 || '',
      formData.feature3 || '',
      formData.feature4 || '',
      formData.feature5 || '',
      formData.feature6 || '',
      formData.name || '',
      formData.agentTitle || '',
      formData.phone || '',
      formData.email || '',
      zipFilename,
      (err) => {
        if (err) {
          console.error('Database error:', err);
        }
        stmt.finalize();
      }
    );

    res.json({ 
      success: true, 
      message: 'Property data and images collected successfully!',
      zipFilename: zipFilename
    });
  } catch (error) {
    console.error('Error processing submission:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing submission: ' + error.message 
    });
  }
});

// Route: Get all submissions (for admin/designer panel)
app.get('/api/submissions', (req, res) => {
  const completed = req.query.completed;
  let query = 'SELECT * FROM submissions';
  const params = [];
  
  if (completed !== undefined) {
    query += ' WHERE completed = ?';
    params.push(completed === 'true' ? 1 : 0);
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Error fetching submissions' });
    } else {
      res.json(rows);
    }
  });
});

// Route: Mark submission as completed
app.post('/api/submissions/:id/complete', (req, res) => {
  const id = req.params.id;
  const completed = req.body.completed !== false; // Default to true if not specified
  
  db.run(
    'UPDATE submissions SET completed = ?, completed_at = ? WHERE id = ?',
    [completed ? 1 : 0, completed ? new Date().toISOString() : null, id],
    (err) => {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Error updating submission' });
      } else {
        res.json({ success: true });
      }
    }
  );
});

// Route: Get single submission by ID
app.get('/api/submissions/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM submissions WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Error fetching submission' });
    } else if (!row) {
      res.status(404).json({ error: 'Submission not found' });
    } else {
      res.json(row);
    }
  });
});

// Route: Get images from zip file
app.get('/api/submissions/:id/images', async (req, res) => {
  const id = req.params.id;
  
  // Get submission to find zip filename
  db.get('SELECT zip_filename FROM submissions WHERE id = ?', [id], async (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Error fetching submission' });
    }
    
    if (!row || !row.zip_filename) {
      return res.status(404).json({ error: 'Submission or zip file not found' });
    }
    
    const zipPath = path.join(zipsDir, row.zip_filename);
    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ error: 'Zip file not found' });
    }
    
    try {
      const zip = new JSZip();
      const zipData = await zip.loadAsync(fs.readFileSync(zipPath));
      
      const images = [];
      for (const fileName in zipData.files) {
        const file = zipData.files[fileName];
        if (file.dir) continue;
        
        // Check if it's an image file with _1 through _10 suffix
        const match = fileName.match(/_(\d+)\.(jpg|jpeg|png|gif|webp)$/i);
        if (match) {
          const position = parseInt(match[1], 10);
          if (position >= 1 && position <= 10) {
            const imageData = await file.async('base64');
            images.push({
              position: position,
              data: imageData,
              filename: fileName,
              mimeType: `image/${match[2].toLowerCase()}`
            });
          }
        }
      }
      
      // Sort by position
      images.sort((a, b) => a.position - b.position);
      res.json(images);
    } catch (error) {
      console.error('Error extracting images:', error);
      res.status(500).json({ error: 'Error extracting images from zip' });
    }
  });
});

// Route: Download zip file
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(zipsDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Error downloading file' });
      }
    });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Route: Resubmit from ZIP file
app.post('/api/resubmit-zip', upload.single('zipFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No ZIP file provided' });
    }

    const zipPath = req.file.path;
    
    try {
      // Read and parse the ZIP file
      const zip = new JSZip();
      const zipData = await zip.loadAsync(fs.readFileSync(zipPath));
      
      // Find and parse CSV file
      let csvFile = null;
      for (const fileName in zipData.files) {
        if (fileName.toLowerCase().endsWith('.csv')) {
          csvFile = zipData.files[fileName];
          break;
        }
      }
      
      if (!csvFile) {
        fs.unlinkSync(zipPath);
        return res.status(400).json({ success: false, message: 'No CSV file found in ZIP' });
      }
      
      const csvText = await csvFile.async('string');
      const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
      
      if (lines.length < 2) {
        fs.unlinkSync(zipPath);
        return res.status(400).json({ success: false, message: 'Invalid CSV format' });
      }
      
      // Parse CSV using proper CSV parsing (handles quoted fields with commas)
      function parseCSVLine(line) {
        const fields = [];
        let inQuotes = false;
        let currentField = '';
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              // Escaped quote
              currentField += '"';
              i++; // Skip next quote
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            fields.push(currentField.trim());
            currentField = '';
          } else {
            currentField += char;
          }
        }
        fields.push(currentField.trim());
        return fields;
      }
      
      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
      const values = parseCSVLine(lines[1]);
      
      // Create form data object
      const formData = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        // Remove surrounding quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/""/g, '"');
        }
        formData[header] = value;
      });
      
      // Extract images from ZIP
      const imageFiles = [];
      for (const fileName in zipData.files) {
        const file = zipData.files[fileName];
        if (file.dir) continue;
        
        const match = fileName.match(/_(\d+)\.(jpg|jpeg|png|gif|webp)$/i);
        if (match) {
          const position = parseInt(match[1], 10);
          if (position >= 1 && position <= 10) {
            const imageData = await file.async('nodebuffer');
            const tempPath = path.join(uploadsDir, `temp_${position}_${Date.now()}.${match[2]}`);
            fs.writeFileSync(tempPath, imageData);
            imageFiles.push({
              path: tempPath,
              originalname: fileName,
              mimetype: `image/${match[2].toLowerCase()}`,
              size: imageData.length
            });
          }
        }
      }
      
      // Sort images by position
      imageFiles.sort((a, b) => {
        const aMatch = a.originalname.match(/_(\d+)/);
        const bMatch = b.originalname.match(/_(\d+)/);
        return (parseInt(aMatch[1]) || 0) - (parseInt(bMatch[1]) || 0);
      });
      
      if (imageFiles.length !== 10) {
        // Clean up
        imageFiles.forEach(f => fs.unlinkSync(f.path));
        fs.unlinkSync(zipPath);
        return res.status(400).json({ 
          success: false, 
          message: `Expected 10 images, found ${imageFiles.length}` 
        });
      }
      
      // Create new zip file (same as regular submission)
      const newZip = new JSZip();
      const csvHeader = 'bedrooms,bathrooms,sqft,price,street,street2,cityState,tagline,description,headline,disclaimer,feature1,feature2,feature3,feature4,feature5,feature6,name,agentTitle,phone,email\n';
      const csvRow = createCSVRow(formData);
      newZip.file('property_data.csv', csvHeader + csvRow);
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const fileData = fs.readFileSync(file.path);
        const renamedName = renameImageForPlugin(file.originalname, i + 1);
        newZip.file(renamedName, fileData);
      }
      
      const zipBuffer = await newZip.generateAsync({ type: 'nodebuffer' });
      const zipFilename = `property_${Date.now()}_${formData.street?.replace(/\s+/g, '_') || 'listing'}.zip`;
      const newZipPath = path.join(zipsDir, zipFilename);
      fs.writeFileSync(newZipPath, zipBuffer);
      
      // Clean up
      imageFiles.forEach(f => fs.unlinkSync(f.path));
      fs.unlinkSync(zipPath);
      
      // Save to database
      const stmt = db.prepare(`INSERT INTO submissions (
        property_name, bedrooms, bathrooms, sqft, price, street, street2,
        cityState, tagline, description, headline, disclaimer, feature1, feature2, feature3,
        feature4, feature5, feature6, name, agentTitle, phone, email, zip_filename
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      stmt.run(
        formData.street || 'Untitled Property',
        formData.bedrooms || '',
        formData.bathrooms || '',
        formData.sqft || '',
        formData.price || '',
        formData.street || '',
        formData.street2 || '',
        formData.citystate || '',
        formData.tagline || '',
        formData.description || '',
        formData.headline || '',
        formData.disclaimer || '',
        formData.feature1 || '',
        formData.feature2 || '',
        formData.feature3 || '',
        formData.feature4 || '',
        formData.feature5 || '',
        formData.feature6 || '',
        formData.name || '',
        formData.agenttitle || '',
        formData.phone || '',
        formData.email || '',
        zipFilename,
        (err) => {
          if (err) {
            console.error('Database error:', err);
          }
          stmt.finalize();
        }
      );
      
      res.json({ 
        success: true, 
        message: 'Property resubmitted successfully!',
        zipFilename: zipFilename
      });
      
    } catch (error) {
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
      console.error('Error processing resubmit:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error processing ZIP file: ' + error.message 
      });
    }
  } catch (error) {
    console.error('Error resubmitting:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error resubmitting: ' + error.message 
    });
  }
});

// Route: Delete submission
app.delete('/api/submissions/:id', (req, res) => {
  const id = req.params.id;
  
  // Get zip filename before deleting
  db.get('SELECT zip_filename FROM submissions WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    if (row) {
      // Delete zip file
      const zipPath = path.join(zipsDir, row.zip_filename);
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
    }
    
    // Delete from database
    db.run('DELETE FROM submissions WHERE id = ?', [id], (err) => {
      if (err) {
        res.status(500).json({ error: 'Error deleting submission' });
      } else {
        res.json({ success: true });
      }
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
