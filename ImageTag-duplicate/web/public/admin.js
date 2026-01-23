document.addEventListener('DOMContentLoaded', () => {
  const loadingDiv = document.getElementById('loading');
  const activeContainer = document.getElementById('activeContainer');
  const completedContainer = document.getElementById('completedContainer');
  const emptyStateDiv = document.getElementById('emptyState');
  const activeTableBody = document.getElementById('activeTableBody');
  const completedTableBody = document.getElementById('completedTableBody');
  const activeEmptyState = document.getElementById('activeEmptyState');
  const completedEmptyState = document.getElementById('completedEmptyState');

  async function loadSubmissions() {
    try {
      const [activeResponse, completedResponse] = await Promise.all([
        fetch('/api/submissions?completed=false'),
        fetch('/api/submissions?completed=true')
      ]);
      
      const activeSubmissions = await activeResponse.json();
      const completedSubmissions = await completedResponse.json();

      loadingDiv.style.display = 'none';

      // Show empty state if no submissions at all
      if (activeSubmissions.length === 0 && completedSubmissions.length === 0) {
        emptyStateDiv.style.display = 'block';
        return;
      }

      // Render active submissions
      if (activeSubmissions.length > 0) {
        activeContainer.style.display = 'block';
        activeEmptyState.style.display = 'none';
        activeTableBody.innerHTML = '';
        
        activeSubmissions.forEach(submission => {
          const row = createSubmissionRow(submission, false);
          activeTableBody.appendChild(row);
        });
      } else {
        activeContainer.style.display = 'none';
        activeEmptyState.style.display = 'block';
      }

      // Render completed submissions
      if (completedSubmissions.length > 0) {
        completedContainer.style.display = 'block';
        completedEmptyState.style.display = 'none';
        completedTableBody.innerHTML = '';
        
        completedSubmissions.forEach(submission => {
          const row = createSubmissionRow(submission, true);
          completedTableBody.appendChild(row);
        });
      } else {
        completedContainer.style.display = 'none';
        completedEmptyState.style.display = 'block';
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
      loadingDiv.textContent = 'Error loading submissions. Please refresh the page.';
    }
  }

  function createSubmissionRow(submission, isCompleted) {
    const row = document.createElement('tr');
    
    const address = submission.street || 'Untitled Property';
    const cityState = submission.cityState || '';
    const fullAddress = cityState ? `${address}, ${cityState}` : address;
    
    // Create cells
    const idCell = document.createElement('td');
    idCell.textContent = submission.id;
    
    const propertyCell = document.createElement('td');
    propertyCell.innerHTML = `<strong>${address}</strong>`;
    
    const addressCell = document.createElement('td');
    addressCell.textContent = fullAddress;
    
    const priceCell = document.createElement('td');
    priceCell.textContent = submission.price ? '$' + Number(submission.price).toLocaleString() : 'N/A';
    
    const bedBathCell = document.createElement('td');
    bedBathCell.textContent = `${submission.bedrooms || 'N/A'} / ${submission.bathrooms || 'N/A'}`;
    
    const submittedCell = document.createElement('td');
    submittedCell.textContent = formatDate(submission.created_at);
    
    // Create actions cell with stacked buttons
    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions-cell';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexDirection = 'column';
    buttonContainer.style.gap = '0.5rem';
    buttonContainer.style.width = '100%';
    
    if (!isCompleted) {
      const completeBtn = document.createElement('button');
      completeBtn.className = 'btn btn-success btn-small';
      completeBtn.textContent = 'Mark as Completed';
      completeBtn.onclick = () => markAsCompleted(submission.id);
      buttonContainer.appendChild(completeBtn);
    }
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-primary btn-small';
    viewBtn.textContent = 'View Details';
    viewBtn.onclick = () => viewSubmission(submission.id);
    buttonContainer.appendChild(viewBtn);
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-secondary btn-small';
    downloadBtn.textContent = 'Download ZIP';
    downloadBtn.onclick = () => downloadZip(submission.zip_filename);
    buttonContainer.appendChild(downloadBtn);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-small';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteSubmission(submission.id, submission.zip_filename);
    buttonContainer.appendChild(deleteBtn);
    
    actionsCell.appendChild(buttonContainer);
    
    // Append all cells to row
    row.appendChild(idCell);
    row.appendChild(propertyCell);
    row.appendChild(addressCell);
    row.appendChild(priceCell);
    row.appendChild(bedBathCell);
    row.appendChild(submittedCell);
    
    if (isCompleted) {
      const completedCell = document.createElement('td');
      completedCell.textContent = formatDate(submission.completed_at);
      row.appendChild(completedCell);
    }
    
    row.appendChild(actionsCell);
    
    return row;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  window.viewSubmission = function(id) {
    window.location.href = `/detail.html?id=${id}`;
  };

  window.downloadZip = function(filename) {
    window.location.href = `/api/download/${filename}`;
  };

  window.markAsCompleted = async function(id) {
    try {
      const response = await fetch(`/api/submissions/${id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completed: true })
      });

      const data = await response.json();

      if (data.success) {
        // Reload submissions
        loadSubmissions();
      } else {
        alert('Error marking submission as completed. Please try again.');
      }
    } catch (error) {
      console.error('Error marking as completed:', error);
      alert('Error marking submission as completed. Please try again.');
    }
  };

  window.deleteSubmission = async function(id, zipFilename) {
    if (!confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/submissions/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Reload submissions
        loadSubmissions();
      } else {
        alert('Error deleting submission. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Error deleting submission. Please try again.');
    }
  };

  // Resubmit from ZIP functionality
  const resubmitZipInput = document.getElementById('resubmitZipInput');
  const resubmitZipBtn = document.getElementById('resubmitZipBtn');
  
  resubmitZipBtn.onclick = function() {
    resubmitZipInput.click();
  };
  
  resubmitZipInput.onchange = async function() {
    const file = resubmitZipInput.files[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Please select a ZIP file.');
      resubmitZipInput.value = '';
      return;
    }
    
    if (!confirm('This will create a new submission from the ZIP file. Continue?')) {
      resubmitZipInput.value = '';
      return;
    }
    
    try {
      // Show loading
      resubmitZipBtn.disabled = true;
      resubmitZipBtn.textContent = 'Processing...';
      
      const formData = new FormData();
      formData.append('zipFile', file);
      
      const response = await fetch('/api/resubmit-zip', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Property resubmitted successfully!');
        loadSubmissions();
      } else {
        alert('Error: ' + (data.message || 'Failed to resubmit property'));
      }
    } catch (error) {
      console.error('Error resubmitting:', error);
      alert('Error resubmitting property. Please try again.');
    } finally {
      resubmitZipBtn.disabled = false;
      resubmitZipBtn.textContent = 'Resubmit from ZIP';
      resubmitZipInput.value = '';
    }
  };

  // Load submissions on page load
  loadSubmissions();

  // Auto-refresh every 30 seconds
  setInterval(loadSubmissions, 30000);
});
