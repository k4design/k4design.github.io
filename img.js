// Function to replace image src attributes in the CMS content
function replaceImageSrcs() {
  // Select the CMS content container (you may need to adjust this selector)
  const cmsContent = document.querySelector('body');

  if (!cmsContent) {
    console.error('CMS content container not found.');
    return;
  }

  // Find all img elements within the CMS content
  const imgElements = cmsContent.querySelectorAll('img');

  // Loop through the img elements and replace src attributes
  imgElements.forEach((imgElement) => {
    const currentSrc = imgElement.getAttribute('src');

    if (currentSrc && currentSrc.includes('https://cdn.chime.me/')) {
      // Replace the src attribute with the new URL
      imgElement.setAttribute('src', currentSrc.replace('https://cdn.chime.me/', 'https://k4design.github.io/'));
    }
  });
}

// Call the function to replace image src attributes
replaceImageSrcs();
