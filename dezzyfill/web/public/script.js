document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('propertyForm');
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('images');
  const imagePreview = document.getElementById('imagePreview');
  const submitBtn = document.getElementById('submitBtn');
  const messageDiv = document.getElementById('message');
  const imageCount = document.getElementById('imageCount');
  
  let selectedFiles = [];

  // Upload area click
  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    handleFiles(Array.from(e.target.files));
  });

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    handleFiles(files);
  });

  function handleFiles(files) {
    // Filter to only image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    // Check file sizes
    const oversizedFiles = imageFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      showMessage('Some files are too large. Maximum size is 10MB per file.', 'error');
      return;
    }

    // Calculate how many we can add
    const remainingSlots = 10 - selectedFiles.length;
    const filesToAdd = imageFiles.slice(0, remainingSlots);
    
    // Add files
    filesToAdd.forEach(file => {
      selectedFiles.push(file);
      displayImagePreview(file);
    });

    // Update count display
    updateImageCount();

    // Show messages
    if (imageFiles.length > remainingSlots) {
      showMessage(`Only ${remainingSlots} more image(s) can be added. Exactly 10 images are required.`, 'error');
    } else if (selectedFiles.length === 10) {
      showMessage('All 10 images have been selected!', 'success');
    }

    // Update file input
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;
  }

  function updateImageCount() {
    const count = selectedFiles.length;
    imageCount.textContent = `${count} / 10 images`;
    
    if (count === 10) {
      imageCount.style.color = 'var(--success-color)';
      imageCount.style.fontWeight = '600';
    } else {
      imageCount.style.color = 'var(--text-secondary)';
      imageCount.style.fontWeight = 'normal';
    }
  }

  // Initialize image count display
  updateImageCount();

  function displayImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement('div');
      div.className = 'image-preview-item';
      div.dataset.filename = file.name;
      
      const img = document.createElement('img');
      img.src = e.target.result;
      img.alt = file.name;
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.innerHTML = '×';
      removeBtn.type = 'button';
      removeBtn.onclick = () => removeImage(file.name);
      
      div.appendChild(img);
      div.appendChild(removeBtn);
      imagePreview.appendChild(div);
    };
    reader.readAsDataURL(file);
  }

  function removeImage(filename) {
    selectedFiles = selectedFiles.filter(file => file.name !== filename);
    
    const previewItem = imagePreview.querySelector(`[data-filename="${filename}"]`);
    if (previewItem) {
      previewItem.remove();
    }

    // Update count display
    updateImageCount();

    // Update file input
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;
  }

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    
    // Validate required fields
    if (!formData.get('street') || !formData.get('cityState')) {
      showMessage('Please fill in at least Street Address and City/State.', 'error');
      return;
    }

    // Validate exactly 10 images
    if (selectedFiles.length !== 10) {
      showMessage(`Please upload exactly 10 images. You currently have ${selectedFiles.length} image(s).`, 'error');
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.querySelector('span').style.display = 'none';
    submitBtn.querySelector('.spinner').style.display = 'inline';

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        showMessage('Property data and images submitted successfully! The zip file has been created and is available in the admin panel.', 'success');
        form.reset();
        selectedFiles = [];
        imagePreview.innerHTML = '';
        updateImageCount();
      } else {
        showMessage(data.message || 'Error submitting form. Please try again.', 'error');
      }
    } catch (error) {
      showMessage('Network error. Please check your connection and try again.', 'error');
      console.error('Error:', error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').style.display = 'inline';
      submitBtn.querySelector('.spinner').style.display = 'none';
    }
  });

  // Handle form reset
  form.addEventListener('reset', () => {
    selectedFiles = [];
    imagePreview.innerHTML = '';
    updateImageCount();
  });

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    // Scroll to message
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 5000);
    }
  }
});
