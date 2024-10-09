import React from 'react';
import { FaEraser, FaEdit } from 'react-icons/fa'; // Import icons

type BrushToolProps = {
  onClose: () => void;
  activeTool: 'erase' | 'restore' | null;
  onToolSelect: (tool: 'erase' | 'restore') => void;
};

const BrushTool: React.FC<BrushToolProps> = ({
  onClose,
  activeTool,
  onToolSelect,
}) => {

  return (
      <div className="brush-tool-popup">
        {/* Close Button */}
        <button className="close-button" onClick={onClose}>
          ✕
        </button>

        <div className="brush-tool-content">
          <h2 className="brush-tool-title">Manually Erase or Restore</h2>

          {/* Erase and Restore Buttons */}
          <div className="brush-tool-buttons">
            <button
              className={`brush-tool-btn ${activeTool === 'erase' ? 'active' : ''}`}
              onClick={() => onToolSelect('erase')}
            >
              <FaEraser className="mr-2" />
              <span>Erase</span>
            </button>

            <button
              className={`brush-tool-btn ${activeTool === 'restore' ? 'active' : ''}`}
              onClick={() => onToolSelect('restore')}
            >
              <FaEdit className="mr-2" />
              <span>Restore</span>
            </button>
          </div>

          {/* Brush Size Slider */}
          <div className="brush-tool-slider">
            <label className="brush-tool-label">Brush Size</label>
            <input type="range" min="5" max="80" className="brush-size-range" />
          </div>

          {/* Reset and Done Buttons */}
          <div className="brush-tool-actions">
            <button className="brush-tool-reset">Reset</button>
            <button className="brush-tool-done" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
  );
};

export default BrushTool;
