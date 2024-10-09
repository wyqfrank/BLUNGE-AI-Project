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
    if (!canvas) return; // Add null check

    const ctx = canvas.getContext('2d');
    if (ctx && processedImageRef.current) {
      canvas.width = processedImageRef.current.width;
      canvas.height = processedImageRef.current.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadedImage(event.target.files[0]);
      setProcessedImage(null);
      initializeCanvas();
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
        setCursorPosition({ x: offsetX / scale, y: offsetY / scale });

        if (isDrawing) {
          draw(offsetX, offsetY);
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
      }
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const draw = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Add null check

    const ctx = canvas.getContext('2d');
    if (ctx && activeTool && processedImageRef.current && originalImageRef.current) {
      ctx.save();

      // Set up the brush
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2, true);
      ctx.closePath();

      if (activeTool === 'erase') {
        // For erasing, we'll make the area transparent
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
      } else if (activeTool === 'restore') {
        // For restoring, we'll draw the original image in this spot
        ctx.clip();
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(originalImageRef.current, 0, 0, canvas.width, canvas.height);
      }

      ctx.restore();
    }
  };

  const handleImageBoxClick = () => {
    if (!activeTool) {
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
            showCheckerboard={Boolean(processedImage)}
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
