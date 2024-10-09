import React, { useState } from 'react';
import ImageBox from './components/ImageBox';
import Button from './components/Buttons';
import BrushTool from './components/BrushTool'; 

import './App.css';

const App: React.FC = () => {
  const [mode, setMode] = useState<'select' | 'unselect'>('select');
  const [isSegmentView, setIsSegmentView] = useState(false); 
  // for the brush tool
  const [showBrushTool, setShowBrushTool] = useState(false); 
  const [isEditing, setIsEditing] = useState(false); // Track edit mode
  const [activeTool, setActiveTool] = useState<'erase' | 'restore' | null>(null); 


  const handleModeToggle = (newMode: 'select' | 'unselect') => {
    setMode(newMode);
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

  // Handle Edit button click to enter edit mode
  const handleEditClick = () => {
    setIsEditing(true);
  };

  // Handle Close button click (X) to exit edit mode
  const handleCloseEdit = () => {
    setIsEditing(false);
  };

  // Handle Done button click to exit edit mode
  const handleDoneEdit = () => {
    setIsEditing(false);
  };

  // Handle tool selection (Erase or Restore)
  const handleToolSelect = (tool: "erase" | "restore") => {
    setActiveTool(tool);
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
      <ImageBox 
        mode={mode} 
        isSegmentView={isSegmentView} 
        onUndo={handleUndo} 
        activeTool={activeTool} 
       
      />      <div className="buttons">
          <Button text="Magic Remove" onClick={() => handleModeToggle('select')} isActive={mode === 'select'} />
          <Button text="Brush" onClick={handleBrushClick} />
          <Button text="Toggle View" onClick={handleToggleView} />
          <Button text="Undo" onClick={handleUndo} />
          <Button text="Download Mask" onClick={handleDownload} />
        </div>
        {showBrushTool && (
          <BrushTool 
            onClose={handleBrushToolClose} 
            activeTool={activeTool} 
            onToolSelect={handleToolSelect}
          />  
        )}
      </div>
    </div>
  );
};

export default App;
