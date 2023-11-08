// Function to replace image src attributes in the entire document
function replaceImagePaths() {
  // Find all img elements within the entire document
  const imgElements = document.querySelectorAll('img');

  // Loop through the img elements and replace src attributes
  imgElements.forEach((imgElement) => {
    const currentSrc = imgElement.getAttribute('src');

    if (currentSrc && currentSrc.includes('https://cdn.chime.me/')) {
      // Replace the src attribute with the new URL
      imgElement.setAttribute('src', currentSrc.replace('https://cdn.chime.me/', 'https://k4design.github.io/'));
    }
  });

  // Find all CSS stylesheets in the entire document
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');

  // Loop through the stylesheets and update their content
  stylesheets.forEach((stylesheet) => {
    fetch(stylesheet.href)
      .then((response) => response.text())
      .then((cssText) => {
        // Replace image paths in the CSS text
        const updatedCssText = cssText.replace(/https:\/\/cdn\.chime\.me\//g, 'https://k4design.github.io/');

        // Create a new stylesheet with the updated content
        const updatedStylesheet = document.createElement('style');
        updatedStylesheet.textContent = updatedCssText;

        // Replace the old stylesheet with the new one
        document.head.appendChild(updatedStylesheet);
        document.head.removeChild(stylesheet);
      })
      .catch((error) => {
        console.error(`Failed to fetch CSS: ${error}`);
      });
  });
}

// Call the function to replace image paths in the entire document
replaceImagePaths();
