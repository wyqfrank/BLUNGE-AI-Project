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
  const [brushSize, setBrushSize] = useState(20);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const processedImageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [backgroundRemovedImage, setBackgroundRemovedImage] = useState<string | null>(null); // Store the background-removed image

  
  // Ref to track the last point for continuous drawing
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  
  const [showCheckerboard, setShowCheckerboard] = useState(false); // State variable to control background transparency

  useEffect(() => {
    if (processedImage) {
      const img = new Image();
      img.src = processedImage;
      img.onload = () => {
        processedImageRef.current = img;
        initializeCanvas();
      };
    }
  }, [processedImage]);

  useEffect(() => {
    if (uploadedImage) {
      const img = new Image();
      img.src = URL.createObjectURL(uploadedImage);
      img.onload = () => {
        originalImageRef.current = img;
      };
    }
  }, [uploadedImage]);

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !processedImageRef.current) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas dimensions to match the processed image
    canvas.width = processedImageRef.current.width;
    canvas.height = processedImageRef.current.height;

    // Clear the canvas and draw the processed image with a transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(processedImageRef.current, 0, 0);
  };

  const draw = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
  
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !processedImageRef.current || !originalImageRef.current) return;
  
    ctx.save();
    
    ctx.lineCap = 'round';  // Make the brush strokes rounded
    ctx.lineJoin = 'round'; // Ensure smooth corners when drawing
    ctx.lineWidth = brushSize; // Set the width of the brush
  
    // Get the last point for smooth drawing
    const lastPoint = lastPointRef.current;
  
    if (activeTool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out'; // For erasing
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)'; // Erasing to transparency
  
      ctx.beginPath();
      if (lastPoint) {
        ctx.moveTo(lastPoint.x, lastPoint.y);
      } else {
        ctx.moveTo(x, y);
      }
      ctx.lineTo(x, y);  // Draw a line to the current point
      ctx.stroke();
    } else if (activeTool === 'restore') {
      // Restore functionality
      ctx.globalCompositeOperation = 'source-over';
  
      // Begin the path for the brush stroke
      ctx.beginPath();
      if (lastPoint) {
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(x, y);
      } else {
        // If no last point, create a circle at the current position
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      }
      ctx.closePath();
  
      // Clip the path to restrict drawing to the brush area
      ctx.clip();
  
      // Restore the original image inside the clipped area
      ctx.drawImage(
        originalImageRef.current,
        0,
        0,
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    }
  
    ctx.restore();
  };
  

  const handleDownloadMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'processed_image.png';
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        window.URL.revokeObjectURL(url);
      }
    }, 'image/png');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadedImage(event.target.files[0]);
      setProcessedImage(null);
      setShowCheckerboard(false); // Reset checkerboard when a new image is uploaded
    }
  };

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
        setBackgroundRemovedImage(url);
        setShowCheckerboard(true); // Set background to transparent
      } else {
        console.error('Background removal failed');
      }
    } catch (error) {
      console.error('Error removing background:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (activeTool) {
      const containerRect = imageContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const scale = processedImageRef.current ? processedImageRef.current.width / containerRect.width : 1;
        const offsetX = (e.clientX - containerRect.left) * scale;
        const offsetY = (e.clientY - containerRect.top) * scale;
        setCursorPosition({ x: e.clientX - containerRect.left, y: e.clientY - containerRect.top });

        if (isDrawing) {
          draw(offsetX, offsetY);
          lastPointRef.current = { x: offsetX, y: offsetY }; // Store the last point for continuous drawing
        }
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (activeTool && canvasRef.current) {
      setIsDrawing(true);
      const containerRect = imageContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const scale = processedImageRef.current ? processedImageRef.current.width / containerRect.width : 1;
        const offsetX = (e.clientX - containerRect.left) * scale;
        const offsetY = (e.clientY - containerRect.top) * scale;
        draw(offsetX, offsetY);
        lastPointRef.current = { x: offsetX, y: offsetY }; // Initialize the last point
      }
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    lastPointRef.current = null; // Reset the last point when mouse is released
  };

  const handleImageBoxClick = () => {
    if (!activeTool && !uploadedImage) { // Prevent another upload
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      }
    }
  };

  const handleToggleViewPress = () => {
    setIsToggleViewActive(true);
  };

  const handleToggleViewRelease = () => {
    setIsToggleViewActive(false);
  };

  const handleCloseBrushTool = () => {
    setActiveTool(null);
    setShowBrushTool(false);
  };

  return (
    <div className="app" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <div className="container">
        <div
          className="image-box-container"
          ref={imageContainerRef}
          style={{ position: 'relative' }}
          onClick={handleImageBoxClick}
          onMouseDown={handleMouseDown}
          onDragStart={(e) => e.preventDefault()}
        >
          <ImageBox
            isSegmentView={isSegmentView}
            imageUrl={
              isToggleViewActive
                ? uploadedImage
                  ? URL.createObjectURL(uploadedImage)
                  : null
                : processedImage || (uploadedImage ? URL.createObjectURL(uploadedImage) : null)
            }
            showCheckerboard={Boolean(processedImage) && !isToggleViewActive}
          />

          {processedImage && (
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent',
                pointerEvents: 'none',
              }}
            />
          )}

          {loading && (
            <div className="spinner-overlay">
              <div className="spinner"></div>
            </div>
          )}

          {activeTool && cursorPosition && (
            <div
              style={{
                position: 'absolute',
                left: cursorPosition.x - brushSize / 2,
                top: cursorPosition.y - brushSize / 2,
                width: brushSize,
                height: brushSize,
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 0 0 1px black',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        <div className="buttons">
          <Button text="Magic Remove" onClick={handleMagicRemove} />
          <Button
            text="Brush"
            onClick={() => setShowBrushTool(true)}
            disabled={!processedImage}
          />
          <Button
            text="Toggle View"
            onClick={() => {}}
            onMouseDown={handleToggleViewPress}
            onMouseUp={handleToggleViewRelease}
            onMouseLeave={handleToggleViewRelease}
            onTouchStart={handleToggleViewPress}
            onTouchEnd={handleToggleViewRelease}
          />
          <Button text="Undo" onClick={() => console.log("Undo")} />
          <Button text="Download Mask" onClick={() => handleDownloadMask()} />

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
            onClose={handleCloseBrushTool}
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
