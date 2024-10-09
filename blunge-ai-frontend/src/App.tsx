import React, { useState, useRef, useEffect } from 'react';
import ImageBox from './components/ImageBox';
import Button from './components/Buttons';
import BrushTool from './components/BrushTool';
import './App.css';

const App: React.FC = () => {
  const [isSegmentView, setIsSegmentView] = useState(false);
  const [showBrushTool, setShowBrushTool] = useState(false);
  const [activeTool, setActiveTool] = useState<'erase' | 'restore' | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isToggleViewActive, setIsToggleViewActive] = useState(false);
  const [brushSize, setBrushSize] = useState(20); // Brush size state
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const originalImageRef = useRef<HTMLImageElement | null>(null);


  useEffect(() => {
    if (uploadedImage) {
      const img = new Image();
      img.src = URL.createObjectURL(uploadedImage);
      originalImageRef.current = img;
    }
  }, [uploadedImage]);

  
  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadedImage(event.target.files[0]);
      setProcessedImage(null);
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
      const response = await fetch('http://localhost:3000/remove-background', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setProcessedImage(url);
      } else {
        console.error('Background removal failed');
      }
    } catch (error) {
      console.error('Error removing background:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle cursor movement when brush tool is active
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (activeTool) {
      const { clientX, clientY } = e;
      setCursorPosition({ x: clientX, y: clientY });
    }
  };

  // Handle mouse leave (hide cursor circle when leaving the app area)
  const handleMouseLeave = () => {
    if (activeTool) {
      setCursorPosition(null);
    }
  };

  // Handle clicking on ImageBox to trigger file input
  const handleImageBoxClick = () => {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  // Handle Toggle View button press
  const handleToggleViewPress = () => {
    setIsToggleViewActive(true);
  };

  // Handle Toggle View button release
  const handleToggleViewRelease = () => {
    setIsToggleViewActive(false);
  };

  // Handle closing the brush tool (hide the circle and deactivate the tool)
  const handleCloseBrushTool = () => {
    setActiveTool(null); // Hide the circle
    setShowBrushTool(false); // Close the brush tool
  };

  return (
    <div className="app" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div className="container">
        <div
          className="image-box-container"
          style={{ position: 'relative' }}
          onClick={handleImageBoxClick}
        >
          <ImageBox
            isSegmentView={isSegmentView}
            imageUrl={isToggleViewActive ? (uploadedImage ? URL.createObjectURL(uploadedImage) : null) : processedImage || (uploadedImage ? URL.createObjectURL(uploadedImage) : null)}
            showCheckerboard={Boolean(processedImage)}
          />

          {loading && (
            <div className="spinner-overlay">
              <div className="spinner"></div>
            </div>
          )}

          {activeTool && cursorPosition && (
            <div
              style={{
                position: 'fixed',
                left: cursorPosition.x - brushSize / 2,
                top: cursorPosition.y - brushSize / 2,
                width: brushSize,
                height: brushSize,
                borderRadius: '50%',
                backgroundColor: 'rgba(128, 128, 128, 0.8)',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        <div className="buttons">
          <Button text="Magic Remove" onClick={handleMagicRemove} />
          <Button text="Brush" onClick={() => setShowBrushTool(true)} />
          <Button
            text="Toggle View"
            onClick={() => {}}
            onMouseDown={handleToggleViewPress}
            onMouseUp={handleToggleViewRelease}
            onTouchStart={handleToggleViewPress}
            onTouchEnd={handleToggleViewRelease}
          />
          <Button text="Undo" onClick={() => console.log("Undo")} />
          <Button text="Download Mask" onClick={() => console.log("Download Mask")} />

          <input
            type="file"
            accept="image/*"
            id="fileInput"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
        </div>

        {showBrushTool && (
          <BrushTool
            onClose={handleCloseBrushTool} // Close brush tool and deactivate tool
            activeTool={activeTool}
            onToolSelect={setActiveTool}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
          />
        )}
      </div>
    </div>
  );
};

export default App;
