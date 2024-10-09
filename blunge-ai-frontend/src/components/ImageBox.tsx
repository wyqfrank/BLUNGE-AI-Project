// ImageBox.tsx
import React from 'react';

type ImageBoxProps = {
  isSegmentView: boolean;
  imageUrl: string | null;
  showCheckerboard: boolean;
};

const ImageBox: React.FC<ImageBoxProps> = ({ isSegmentView, imageUrl, showCheckerboard }) => {
  return (
    <div
      className="image-box"
      style={{
        backgroundColor: showCheckerboard ? 'transparent' : '#fff',
        // backgroundImage: showCheckerboard
        //   ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)'
        //   : 'none',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 10px 10px',
      }}
    >
      {!showCheckerboard && imageUrl ? (
        <img
          src={imageUrl}
          alt="Uploaded"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      ) : (
        !showCheckerboard && <div className="placeholder-text">Click to upload an image</div>
      )}
    </div>
  );
};

export default ImageBox;
