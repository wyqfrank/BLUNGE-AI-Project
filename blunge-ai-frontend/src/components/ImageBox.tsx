import React, { useState, useEffect } from 'react';

type ImageBoxProps = {
  mode: 'select' | 'unselect';
  isSegmentView: boolean;
  onUndo: () => Promise<string | null>;
  activeTool: 'erase' | 'restore' | null; 
  
};

const ImageBox: React.FC<ImageBoxProps> = ({ mode, isSegmentView, onUndo }) => {
    const [image, setImage] = useState<string | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [loading, setLoading] = useState(false);



useEffect(() => {
    // Trigger toggle view when isSegmentView changes
    const toggleView = async () => {
      if (imageLoaded) {
        setLoading(true);
        const url = isSegmentView ? '/download_image' : '/regenerate_masked_image';
        const response = await fetch(url, { method: 'POST' });
        if (response.ok) {
          const data = await response.json();
          if (data.result_image) {
            setImage('data:image/png;base64,' + data.result_image);
          }
        }
        setLoading(false);
      }
    };
    toggleView();
  }, [isSegmentView, imageLoaded]);  // Run when isSegmentView or imageLoaded changes


  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setLoading(true);
      const formData = new FormData();
      formData.append('image', event.target.files[0]);

      const response = await fetch('/upload_image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImage(e.target?.result as string);
          setImageLoaded(true);
          setLoading(false);
        };
        reader.readAsDataURL(event.target.files[0]);
      } else {
        alert('Failed to upload image');
        setLoading(false);
      }
    }
  };

  const handleImageClick = async (event: React.MouseEvent<HTMLImageElement>) => {
    if (!imageLoaded) return;

    const displayedImage = event.currentTarget;
    const rect = displayedImage.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (displayedImage.naturalWidth / displayedImage.width);
    const y = (event.clientY - rect.top) * (displayedImage.naturalHeight / displayedImage.height);

    // Send the click coordinates and mode ('select' or 'unselect') to the backend
    const response = await fetch('/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ x: Math.round(x), y: Math.round(y), mode }),
    });

    const data = await response.json();
    if (data.result_image) {
      setImage('data:image/png;base64,' + data.result_image);
    }
  };

  const handleUndoClick = async () => {
    const updatedImage = await onUndo();
    if (updatedImage) {
      setImage('data:image/png;base64,' + updatedImage);
    }
  };


  return (
    <div className="image-box" onClick={() => !imageLoaded && document.getElementById('fileInput')?.click()}>
    {loading ? (
      <div className="loading-container">
        <div className="spinner"></div>
        <div className="loading-text">Loading...</div>
      </div>
    ) : image ? (
      <img
        src={image}
        alt="Uploaded"
        style={{ display: image ? 'block' : 'none', maxWidth: '100%', maxHeight: '500px' }}  // Constrain image size
        onClick={handleImageClick}  // Handle click event here
      />
    ) : (
      <div className="placeholder-text">Click to upload an image</div>
    )}
    <input type="file" id="fileInput" style={{ display: 'none' }} onChange={handleImageUpload} />
  </div>
  );
};



export default ImageBox;
