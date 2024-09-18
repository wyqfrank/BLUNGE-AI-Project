document.addEventListener('DOMContentLoaded', () => {
  const imageBox = document.getElementById('imageBox');
  const placeholder = document.getElementById('placeholder');
  const displayedImage = document.getElementById('displayedImage');
  const fileInput = document.getElementById('fileInput');
  const downloadButton = document.getElementById('downloadButton');
  const undoButton = document.getElementById('undoButton');
  const loadingIndicator = document.getElementById('loading');
  const checkerboardOverlay = document.getElementById('checkerboardOverlay');

  const selectModeButton = document.getElementById('selectModeButton');
  const unselectModeButton = document.getElementById('unselectModeButton');
  const toggleSegmentViewButton = document.getElementById('toggleSegmentViewButton');

  let imageLoaded = false;
  let isSegmentView = false;
  let currentMode = 'select'; // Default mode

  // Mode Toggle Event Listeners
  selectModeButton.addEventListener('click', () => {
    currentMode = 'select';
    selectModeButton.classList.add('active');
    unselectModeButton.classList.remove('active');
    console.log("Current mode: Select");
  });

  unselectModeButton.addEventListener('click', () => {
    currentMode = 'unselect';
    unselectModeButton.classList.add('active');
    selectModeButton.classList.remove('active');
    console.log("Current mode: Unselect");
  });

  imageBox.addEventListener('click', () => {
    if (!imageLoaded) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Show the loading indicator
      loadingIndicator.style.display = 'flex';
      placeholder.style.display = 'none';

      const formData = new FormData();
      formData.append('image', file);

      // Send the image to the back end
      await fetch('/upload_image', {
        method: 'POST',
        body: formData
      });

      const reader = new FileReader();
      reader.onload = (e) => {
        displayedImage.src = e.target.result;
        displayedImage.style.display = 'block';
        // Hide the loading indicator
        loadingIndicator.style.display = 'none';
        imageLoaded = true;
      };
      reader.readAsDataURL(file);
    }
  });

  displayedImage.addEventListener('mousedown', async (event) => {
    if (!imageLoaded) return;
  
    event.preventDefault();  // Prevent default behavior
  
    const rect = displayedImage.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (displayedImage.naturalWidth / displayedImage.width);
    const y = (event.clientY - rect.top) * (displayedImage.naturalHeight / displayedImage.height);
  
    // Send the click coordinates and mode ('select' or 'unselect') to the back end
    const response = await fetch('/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ x: Math.round(x), y: Math.round(y), mode: currentMode }) // Send currentMode directly
    });
  
    const data = await response.json();
    if (data.result_image) {
      displayedImage.src = 'data:image/png;base64,' + data.result_image;
    }
  });

  
  // Toggle between interactive mode and final segmentation view
  toggleSegmentViewButton.addEventListener('click', async () => {
    if (!imageLoaded) return;

    isSegmentView = !isSegmentView;

    if (isSegmentView) {
        toggleSegmentViewButton.textContent = 'Toggle View';
        checkerboardOverlay.style.display = 'block';

        // Request the final segmented image (with transparency)
        const response = await fetch('/download_image', { method: 'POST' });
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            displayedImage.src = url;  // Show final segmented image with checkerboard background
        }
    } else {
        toggleSegmentViewButton.textContent = 'Toggle View';
        checkerboardOverlay.style.display = 'none';

        // Regenerate the masked image with darkened background (calling the generate_masked_image function)
        const response = await fetch('/regenerate_masked_image', { method: 'POST' });
        const data = await response.json();
        if (data.result_image) {
            displayedImage.src = 'data:image/png;base64,' + data.result_image;
        }
    }
});

  undoButton.addEventListener('click', async () => {
    if (!imageLoaded) return;

    const response = await fetch('/undo', {
      method: 'POST'
    });

    const data = await response.json();
    if (data.result_image) {
      displayedImage.src = 'data:image/png;base64,' + data.result_image;
    }
  });

  downloadButton.addEventListener('click', async () => {
    if (!imageLoaded) {
      alert('Please insert an image first.');
      return;
    }

    try {
      const response = await fetch('/download_image', {
        method: 'POST'
      });

      if (response.ok) {
        const blob = await response.blob();

        // Create a link to download the image
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'segmented_image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json();
        alert('Error: ' + errorData.error);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('An error occurred while downloading the image.');
    }
  });
});