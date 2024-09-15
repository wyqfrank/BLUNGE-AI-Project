document.addEventListener('DOMContentLoaded', () => {
  const imageBox = document.getElementById('imageBox');
  const placeholder = document.getElementById('placeholder');
  const displayedImage = document.getElementById('displayedImage');
  const maskCanvas = document.getElementById('maskCanvas');
  const fileInput = document.getElementById('fileInput');
  const downloadButton = document.getElementById('downloadButton');
  const undoButton = document.getElementById('undoButton');

  let imageLoaded = false;

  imageBox.addEventListener('click', () => {
    if (!imageLoaded) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
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
        placeholder.style.display = 'none';
        imageLoaded = true;

        // Resize the canvas to match the image
        maskCanvas.width = displayedImage.width;
        maskCanvas.height = displayedImage.height;
      };
      reader.readAsDataURL(file);
    }
  });

  displayedImage.addEventListener('click', async (event) => {
    if (!imageLoaded) return;

    const rect = displayedImage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Determine if it's a left or right click
    const label = event.button === 2 ? 0 : 1;  // Right-click: background (0), Left-click: foreground (1)

    // Send the click coordinates to the back end
    const response = await fetch('/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ x: Math.round(x), y: Math.round(y), label: label })
    });

    const data = await response.json();
    if (data.mask) {
      updateMask(data.mask);
    }
  });

  // Prevent context menu on right-click
  displayedImage.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  undoButton.addEventListener('click', async () => {
    if (!imageLoaded) return;

    const response = await fetch('/undo', {
      method: 'POST'
    });

    const data = await response.json();
    if (data.mask) {
      updateMask(data.mask);
    } else {
      clearMask();
    }
  });

  downloadButton.addEventListener('click', () => {
    if (!imageLoaded) {
      alert('Please insert an image first.');
      return;
    }

    const link = document.createElement('a');
    link.href = maskCanvas.toDataURL('image/png');
    link.download = 'segmentation_mask.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  function updateMask(maskBase64) {
    const maskImage = new Image();
    maskImage.onload = () => {
      const ctx = maskCanvas.getContext('2d');
      ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

      // Draw the mask with transparency
      ctx.globalAlpha = 0.5;  // Adjust transparency here
      ctx.drawImage(maskImage, 0, 0, maskCanvas.width, maskCanvas.height);
      ctx.globalAlpha = 1.0;  // Reset transparency
    };
    maskImage.src = 'data:image/png;base64,' + maskBase64;
  }

  function clearMask() {
    const ctx = maskCanvas.getContext('2d');
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  }
});
