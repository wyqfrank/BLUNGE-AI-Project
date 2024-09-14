// script.js

document.addEventListener('DOMContentLoaded', () => {
    const imageBox = document.getElementById('imageBox');
    const placeholder = document.getElementById('placeholder');
    const displayedImage = document.getElementById('displayedImage');
    const fileInput = document.getElementById('fileInput');
    const downloadButton = document.getElementById('downloadButton');
  
    let imageSrc = null;
  
    imageBox.addEventListener('click', () => {
      fileInput.click();
    });
  
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        // Display the selected image
        imageSrc = URL.createObjectURL(file);
        displayedImage.src = imageSrc;
        displayedImage.style.display = 'block';
        placeholder.style.display = 'none';
      }
    });
  
    downloadButton.addEventListener('click', () => {
      if (imageSrc) {
        const link = document.createElement('a');
        link.href = imageSrc;
        link.download = 'downloaded_image';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Please insert an image first.');
      }
    });
  });
  