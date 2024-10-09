import React from 'react';
import { FaHandPointer, FaUndo, FaEye, FaEraser, FaDownload, FaMagic } from "react-icons/fa";

type ButtonProps = {
  text: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  onMouseDown?: () => void;  // Optional mouse down event
  onMouseUp?: () => void;    // Optional mouse up event
  onTouchStart?: () => void; // Optional touch start event
  onTouchEnd?: () => void;   // Optional touch end event
};

const Button: React.FC<ButtonProps> = ({
  text,
  onClick,
  isActive,
  onMouseDown,
  onMouseUp,
  onTouchStart,
  onTouchEnd,
  disabled
}) => {
  let icon;

  // Choose the icon based on the button text
  switch (text) {
    case 'Magic Remove':
      icon = <FaHandPointer />;
      break;
    case 'Brush':
      icon = <FaMagic />;
      break;
    case 'Undo':
      icon = <FaUndo />;
      break;
    case 'Toggle View':
      icon = <FaEye />;
      break;
    case 'Download Mask':
      icon = <FaDownload />;
      break;
    default:
      icon = null;
  }

  return (
    <button
      className={`action-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
      onMouseDown={onMouseDown}  // Handle mouse down event
      onMouseUp={onMouseUp}      // Handle mouse up event
      onTouchStart={onTouchStart} // Handle touch start event
      onTouchEnd={onTouchEnd}
      disabled={disabled}    // Handle touch end event
    >
      {icon}
      <span style={{ marginLeft: '8px' }}>{text}</span>
    </button>
  );
};

export default Button;
