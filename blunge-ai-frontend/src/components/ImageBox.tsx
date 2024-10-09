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


  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImageFile(file); // Store the file for later use
      
      const reader = new FileReader();
      setLoading(true);
      
      reader.onload = (e) => {
        if (e.target?.result) {
          setImage(e.target.result as string);
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
    ) : image ? (
      <img
        src={image}
        alt="Uploaded"
        style={{ display: image ? 'block' : 'none', maxWidth: '100%', maxHeight: '100%' }}  // Constrain image size
      />
    ) : (
      <div className="placeholder-text">Click to upload an image</div>
    )}
    <input type="file" id="fileInput" style={{ display: 'none' }} onChange={handleImageUpload} />
  </div>
  );
};



export default ImageBox;
