const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const JSZip = require('jszip');
const sqlite3 = require('sqlite3').verbose();

const zipsDir = path.join(__dirname, 'zips');
const dbPath = path.join(__dirname, 'submissions.db');

// Sample property data - all fields filled
const sampleData = {
  bedrooms: '4',
  bathrooms: '3',
  sqft: '2850',
  price: '675000',
  street: '456 Oakwood Drive',
  street2: '',
  cityState: 'San Francisco CA',
  tagline: 'Stunning Modern Home with Mountain Views',
  description: 'Beautiful 4-bedroom, 3-bathroom home featuring an open floor plan, updated kitchen with granite countertops, spacious master suite, and a large backyard perfect for entertaining. Located in a quiet neighborhood with excellent schools nearby.',
  feature1: 'Hardwood Floors Throughout',
  feature2: 'Updated Kitchen with Granite',
  feature3: 'Stainless Steel Appliances',
  feature4: 'Master Suite with Walk-in Closet',
  feature5: 'Large Backyard with Deck',
  feature6: 'Two-Car Garage',
  name: 'Sarah Johnson',
  agentTitle: 'Senior Real Estate Agent',
  phone: '(415) 555-7890',
  email: 'sarah.johnson@realestate.com'
};

// Free stock house images from Unsplash (using source URLs for reliability)
const houseImageUrls = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Modern house exterior
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // House front
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // House exterior
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Modern home
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25146c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Living room
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Kitchen
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Bedroom
  'https://images.unsplash.com/photo-1600607687644-c7171b42498b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Bathroom
  'https://images.unsplash.com/photo-1600607688904-e9931c5e0b0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Dining room
  'https://images.unsplash.com/photo-1600566753086-5f9a7a3c5c3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'  // Backyard
];

// Helper function to create CSV row
function createCSVRow(data) {
  const fields = [
    'bedrooms', 'bathrooms', 'sqft', 'price', 'street', 'street2', 
    'cityState', 'tagline', 'description', 'feature1', 'feature2', 
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

// Download image from URL
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        return downloadImage(response.headers.location).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    
    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Helper function to rename image for plugin format
function renameImageForPlugin(originalName, index) {
  const ext = path.extname(originalName) || '.jpg';
  const baseName = path.basename(originalName, ext);
  return `${baseName}_${index}${ext}`;
}

async function createSampleSubmission() {
  try {
    // Ensure zips directory exists
    if (!fs.existsSync(zipsDir)) {
      fs.mkdirSync(zipsDir, { recursive: true });
    }

    // Create zip file
    const zip = new JSZip();
    
    // Add CSV file
    const csvHeader = 'bedrooms,bathrooms,sqft,price,street,street2,cityState,tagline,description,feature1,feature2,feature3,feature4,feature5,feature6,name,agentTitle,phone,email\n';
    const csvRow = createCSVRow(sampleData);
    zip.file('property_data.csv', csvHeader + csvRow);

    // Download and add 10 house images (renamed with _1 through _10 suffixes)
    console.log('Downloading house images from Unsplash...');
    for (let i = 0; i < houseImageUrls.length; i++) {
      try {
        const imageData = await downloadImage(houseImageUrls[i]);
        const originalName = `house_image_${i + 1}.jpg`;
        const renamedName = renameImageForPlugin(originalName, i + 1);
        zip.file(renamedName, imageData);
        console.log(`  Downloaded and added image ${i + 1}/10: ${renamedName}`);
      } catch (error) {
        console.error(`  Error downloading image ${i + 1}:`, error.message);
        // Create a placeholder if download fails
        const placeholder = Buffer.from([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
        ]);
        const renamedName = renameImageForPlugin(`house_image_${i + 1}.jpg`, i + 1);
        zip.file(renamedName, placeholder);
      }
    }

    // Generate zip file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipFilename = `property_${Date.now()}_${sampleData.street.replace(/\s+/g, '_')}.zip`;
    const zipPath = path.join(zipsDir, zipFilename);
    
    fs.writeFileSync(zipPath, zipBuffer);
    console.log(`Created zip file: ${zipFilename}`);

    // Add to database
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
      }

      const stmt = db.prepare(`INSERT INTO submissions (
        property_name, bedrooms, bathrooms, sqft, price, street, street2,
        cityState, tagline, description, feature1, feature2, feature3,
        feature4, feature5, feature6, name, agentTitle, phone, email, zip_filename
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      stmt.run(
        sampleData.street,
        sampleData.bedrooms,
        sampleData.bathrooms,
        sampleData.sqft,
        sampleData.price,
        sampleData.street,
        sampleData.street2,
        sampleData.cityState,
        sampleData.tagline,
        sampleData.description,
        sampleData.feature1,
        sampleData.feature2,
        sampleData.feature3,
        sampleData.feature4,
        sampleData.feature5,
        sampleData.feature6,
        sampleData.name,
        sampleData.agentTitle,
        sampleData.phone,
        sampleData.email,
        zipFilename,
        (err) => {
          if (err) {
            console.error('Database error:', err);
            process.exit(1);
          }
          console.log('Sample submission added to database!');
          stmt.finalize();
          db.close();
        }
      );
    });
  } catch (error) {
    console.error('Error creating sample submission:', error);
    process.exit(1);
  }
}

createSampleSubmission();
