import React, { useState } from 'react';
import ImageBox from './components/ImageBox';
import Button from './components/Buttons';
import './App.css';

const App: React.FC = () => {
  const [mode, setMode] = useState<'select' | 'unselect'>('select');
  const [isSegmentView, setIsSegmentView] = useState(false); 

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

  return (
    <div className="app">
      <div className="container">
      <ImageBox mode={mode} isSegmentView={isSegmentView} onUndo={handleUndo} /> {/* Pass toggle view and undo */}
      <div className="buttons">
          <Button text="Select" onClick={() => handleModeToggle('select')} isActive={mode === 'select'} />
          <Button text="Unselect" onClick={() => handleModeToggle('unselect')} isActive={mode === 'unselect'} />
          <Button text="Toggle View" onClick={handleToggleView} />
          <Button text="Undo" onClick={handleUndo} />
          <Button text="Download Mask" onClick={handleDownload} />
        </div>
      </div>
    </div>
  );
};

export default App;
