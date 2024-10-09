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
      setUploadedImage(event.target.files[0]); // Set uploaded image file in state
      setProcessedImage(null); // Reset processed image if a new image is uploaded
    }
  };

  // Handle background removal
  const handleMagicRemove = async () => {
    if (!uploadedImage) {
      alert("Please upload an image first.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('image', uploadedImage);

    try {
      // Send image to backend for background removal
      const response = await fetch('http://localhost:3000/remove-background', {
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

  // Handle clicking on ImageBox to trigger file input
  const handleImageBoxClick = () => {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();  // Programmatically trigger the file input click
    }
  };

  return (
    <div className="app">
      <div className="container">
        {/* ImageBox with a loading spinner */}
        <div className="image-box-container" style={{ position: 'relative' }} onClick={handleImageBoxClick}>
          <ImageBox
            isSegmentView={isSegmentView}
            imageUrl={processedImage || (uploadedImage ? URL.createObjectURL(uploadedImage) : null)} // Display original or processed image
          />
          {/* Loading spinner overlay */}
          {loading && (
            <div className="spinner-overlay">
              <div className="spinner"></div>
            </div>
          )}
        </div>

        <div className="buttons">
          <Button text="Magic Remove" onClick={handleMagicRemove} />
          <Button text="Brush" onClick={() => setShowBrushTool(true)} />
          <Button text="Toggle View" onClick={() => setIsSegmentView(!isSegmentView)} />
          <Button text="Undo" onClick={() => console.log("Undo")} />
          <Button text="Download Mask" onClick={() => console.log("Download Mask")} />

          {/* Upload Image Button */}
          <input
            type="file"
            accept="image/*"
            id="fileInput"
            style={{ display: 'none' }} // Hidden input field
            onChange={handleImageUpload}  // Handle the upload here
          />
        </div>

        {showBrushTool && (
          <BrushTool
            onClose={() => setShowBrushTool(false)}
            activeTool={activeTool}
            onToolSelect={setActiveTool}
          />
        )}
      </div>
    </div>
  );
};

export default App;
