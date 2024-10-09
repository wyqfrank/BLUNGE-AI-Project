import React, { useState, useEffect } from 'react';

type ImageBoxProps = {
  isSegmentView: boolean;
  onUndo: () => Promise<string | null>;
  activeTool: 'erase' | 'restore' | null;
  imageUrl: string | null; // Add imageUrl prop to display the image
};

const ImageBox: React.FC<ImageBoxProps> = ({ isSegmentView, onUndo, activeTool, imageUrl }) => {
  const [image, setImage] = useState<string | null>(null); // Manage image state
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
            setImage('data:image/png;base64,' + data.result_image); // Use setImage here
          }
        }
        setLoading(false);
      }
    };
    toggleView();
  }, [isSegmentView, imageLoaded]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      setLoading(true);
      
      reader.onload = (e) => {
        if (e.target?.result) {
          setImage(e.target.result as string); // Set the image state when file is loaded
          setImageLoaded(true);
        }
        setLoading(false);
      };

      reader.onerror = (e) => {
        console.error('Error reading file:', e);
        setLoading(false);
        alert('Failed to load image');
      };

      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="image-box" onClick={() => !imageLoaded && document.getElementById('fileInput')?.click()}>
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <div className="loading-text">Loading...</div>
        </div>
      ) : imageUrl || image ? (
        <img
          src={imageUrl || image || undefined} // Ensure the src is either string or undefined
          alt="Uploaded"
          style={{ display: imageUrl || image ? 'block' : 'none', maxWidth: '100%', maxHeight: '100%' }}  // Constrain image size
        />
      ) : (
        <div className="placeholder-text">Click to upload an image</div>
      )}
      <input type="file" id="fileInput" style={{ display: 'none' }} onChange={handleImageUpload} />
    </div>
  );
};

export default ImageBox;
