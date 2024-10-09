import React from 'react';
import { FaHandPointer, FaUndo, FaEye, FaEraser, FaDownload, FaMagic } from "react-icons/fa";


type ButtonProps = {
  text: string;
  onClick: () => void;
  isActive?: boolean;
};

const Button: React.FC<ButtonProps> = ({ text, onClick, isActive }) => {
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
        <button className={`action-button ${isActive ? 'active' : ''}`} onClick={onClick}>
        {icon} 
        <span style={{ marginLeft: '8px' }}>{text}</span> 
      </button>
  );
};

export default Button;
