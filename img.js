function replaceImagePaths(inputString) {
  // Use a regular expression with the `replace` method to replace all instances
  // of "https://cdn.chime.me/" with "https://k4design.github.io/"
  const replacedString = inputString.replace(/https:\/\/cdn\.chime\.me\//g, 'https://k4design.github.io/');
  return replacedString;
}

// Example usage:
const inputString = "This is an example image URL: https://cdn.chime.me/image1.jpg. And here is another: https://cdn.chime.me/image2.jpg.";
const replacedString = replaceImagePaths(inputString);
console.log(replacedString);

