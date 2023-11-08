const contentContainer = document.getElementById('content-container');
const header = document.getElementById('header');

// Fetch external HTML content
fetch('https://k4design.github.io/message.html')
  .then((response) => response.text())
  .then((html) => {
    // Parse the fetched HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract the content from the fetched HTML
    const message = doc.querySelector('#message').textContent;

    // Update the header with the extracted content
    header.textContent = message;

    // Show the content container
    contentContainer.style.display = 'block';
  })
  .catch((error) => {
    console.error('Failed to fetch external content: ' + error);
  });
