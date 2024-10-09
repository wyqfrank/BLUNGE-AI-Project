import React, { useState } from 'react';
import ImageBox from './components/ImageBox';
import Button from './components/Buttons';
import BrushTool from './components/BrushTool'; 
import './App.css';

const App: React.FC = () => {
  const [isSegmentView, setIsSegmentView] = useState(false); 
  const [showBrushTool, setShowBrushTool] = useState(false); 
  const [activeTool, setActiveTool] = useState<'erase' | 'restore' | null>(null); 
  const [uploadedImage, setUploadedImage] = useState<File | null>(null); // Store uploaded image
  const [processedImage, setProcessedImage] = useState<string | null>(null); // Store background-removed image
  const [loading, setLoading] = useState(false); // Track loading state

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadedImage(event.target.files[0]);
    }
  };

  // Handle background removal
  const handleMagicRemove = async () => {
    if (!uploadedImage) {
      alert("Please upload an image first.");
      return;
    }
    
    setLoading(true);

    // Prepare FormData to send the image to the backend
    const formData = new FormData();
    formData.append('image', uploadedImage);

    try {
      // Send image to backend for background removal
      const response = await fetch('http://localhost:5000/remove-background', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setProcessedImage(url); // Set processed image in state
      } else {
        console.error('Background removal failed');
      }
    } catch (error) {
      console.error('Error removing background:', error);
    } finally {
      setLoading(false); // Stop loading spinner
    }
  };

  const handleUndo = async () => {
    const response = await fetch('/undo', { method: 'POST' });
    if (response.ok) {
      const data = await response.json();
      console.log('Undo successful', data);
      return data.result_image; 
    }
  };

  const handleDownload = async () => {
    const response = await fetch('/download_image', { method: 'POST' });
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'segmented_image.png';
      link.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const handleToggleView = async () => {
    setIsSegmentView(!isSegmentView);  
  };

  // Show the Brush Tool
  const handleBrushClick = () => {
    setShowBrushTool(true);
  };

  // Close the Brush Tool
  const handleBrushToolClose = () => {
    setShowBrushTool(false);
  };

  return (
    <div className="app">
      <div className="container">
        {/* Display the loading spinner or the image */}
        {loading ? (
          <div className="loading-spinner">Processing...</div>
        ) : (
          <ImageBox 
            isSegmentView={isSegmentView}
            onUndo={handleUndo}
            activeTool={activeTool}
            imageUrl={processedImage || (uploadedImage ? URL.createObjectURL(uploadedImage) : null)} // Display original or processed image
          />
        )}

        <div className="buttons">
          <Button text="Magic Remove" onClick={handleMagicRemove} />
          <Button text="Brush" onClick={handleBrushClick} />
          <Button text="Toggle View" onClick={handleToggleView} />
          <Button text="Undo" onClick={handleUndo} />
          <Button text="Download Mask" onClick={handleDownload} />
          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} id="fileInput" />
        </div>

        {showBrushTool && (
          <BrushTool 
            onClose={handleBrushToolClose} 
            activeTool={activeTool} 
            onToolSelect={setActiveTool}
          />
        )}
      </div>
    </div>
  );
};

export default App;
