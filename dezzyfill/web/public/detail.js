document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const submissionId = urlParams.get('id');
  
  if (!submissionId) {
    showError('No submission ID provided');
    return;
  }
  
  loadSubmission(submissionId);
  
  // Download ZIP button
  document.getElementById('downloadZipBtn').onclick = function() {
    const zipFilename = window.submissionData?.zip_filename;
    if (zipFilename) {
      window.location.href = `/api/download/${zipFilename}`;
    }
  };
  
  // Image modal
  const imageModal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const closeModal = document.getElementById('closeModal');
  
  closeModal.onclick = function() {
    imageModal.classList.remove('active');
  };
  
  imageModal.onclick = function(e) {
    if (e.target === imageModal) {
      imageModal.classList.remove('active');
    }
  };
  
  function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').textContent = message;
  }
  
  async function loadSubmission(id) {
    try {
      // Load submission data
      const response = await fetch(`/api/submissions/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load submission');
      }
      
      const submission = await response.json();
      window.submissionData = submission;
      
      // Populate form fields
      populateSubmissionData(submission);
      
      // Load images
      await loadImages(id);
      
      // Show content
      document.getElementById('loading').style.display = 'none';
      document.getElementById('content').style.display = 'block';
      
    } catch (error) {
      console.error('Error loading submission:', error);
      showError('Error loading submission: ' + error.message);
    }
  }
  
  function populateSubmissionData(submission) {
    // Title and address
    const title = submission.street || 'Untitled Property';
    document.getElementById('propertyTitle').textContent = title;
    
    const addressParts = [];
    if (submission.street) addressParts.push(submission.street);
    if (submission.street2) addressParts.push(submission.street2);
    if (submission.cityState) addressParts.push(submission.cityState);
    document.getElementById('propertyAddress').textContent = addressParts.join(', ') || 'No address provided';
    
    // Price
    if (submission.price) {
      const price = Number(submission.price).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      });
      document.getElementById('propertyPrice').textContent = price;
    } else {
      document.getElementById('propertyPrice').textContent = 'Price not specified';
    }
    
    // Stats
    document.getElementById('bedrooms').textContent = submission.bedrooms || '-';
    document.getElementById('bathrooms').textContent = submission.bathrooms || '-';
    if (submission.sqft) {
      document.getElementById('sqft').textContent = Number(submission.sqft).toLocaleString();
    } else {
      document.getElementById('sqft').textContent = '-';
    }
    
    // Description
    if (submission.description) {
      document.getElementById('description').textContent = submission.description;
      document.getElementById('noDescription').style.display = 'none';
    } else {
      document.getElementById('description').style.display = 'none';
      document.getElementById('noDescription').style.display = 'block';
    }
    
    // Headline
    if (submission.headline) {
      document.getElementById('headline').textContent = submission.headline;
      document.getElementById('headlineSection').style.display = 'block';
    }
    
    // Disclaimer
    if (submission.disclaimer) {
      document.getElementById('disclaimer').textContent = submission.disclaimer;
      document.getElementById('disclaimerSection').style.display = 'block';
    }
    
    // Features
    const features = [];
    for (let i = 1; i <= 6; i++) {
      const feature = submission[`feature${i}`];
      if (feature) {
        features.push(feature);
      }
    }
    
    const featuresList = document.getElementById('featuresList');
    if (features.length > 0) {
      featuresList.innerHTML = '';
      features.forEach(feature => {
        const item = document.createElement('div');
        item.className = 'feature-item';
        item.textContent = feature;
        featuresList.appendChild(item);
      });
      document.getElementById('noFeatures').style.display = 'none';
    } else {
      featuresList.innerHTML = '';
      document.getElementById('noFeatures').style.display = 'block';
    }
    
    // Agent info
    document.getElementById('agentName').textContent = submission.name || '-';
    document.getElementById('agentTitle').textContent = submission.agentTitle || '-';
    document.getElementById('agentPhone').textContent = submission.phone || '-';
    document.getElementById('agentEmail').textContent = submission.email || '-';
  }
  
  async function loadImages(id) {
    try {
      const response = await fetch(`/api/submissions/${id}/images`);
      if (!response.ok) {
        throw new Error('Failed to load images');
      }
      
      const images = await response.json();
      const gallery = document.getElementById('imageGallery');
      
      if (images.length === 0) {
        document.getElementById('noImages').style.display = 'block';
        gallery.style.display = 'none';
        return;
      }
      
      gallery.innerHTML = '';
      images.forEach(image => {
        const item = document.createElement('div');
        item.className = 'image-item';
        
        const img = document.createElement('img');
        img.src = `data:${image.mimeType};base64,${image.data}`;
        img.alt = `Property image ${image.position}`;
        
        const number = document.createElement('div');
        number.className = 'image-number';
        number.textContent = image.position;
        
        item.appendChild(img);
        item.appendChild(number);
        
        item.onclick = function() {
          modalImage.src = img.src;
          imageModal.classList.add('active');
        };
        
        gallery.appendChild(item);
      });
      
    } catch (error) {
      console.error('Error loading images:', error);
      document.getElementById('noImages').style.display = 'block';
      document.getElementById('noImages').textContent = 'Error loading images';
    }
  }
});
