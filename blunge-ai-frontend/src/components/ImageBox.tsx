import React from 'react';

type ImageBoxProps = {
  isSegmentView: boolean;
  imageUrl: string | null;
  showCheckerboard: boolean; // New prop to show checkerboard background
};

const ImageBox: React.FC<ImageBoxProps> = ({ isSegmentView, imageUrl, showCheckerboard }) => {
  return (
    <div
      className="image-box"
      style={{
        backgroundColor: showCheckerboard ? 'transparent' : '#fff', // Transparent background when the checkerboard is shown
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 10px 0, 10px -10px, 0px 10px',
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Uploaded"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      ) : (
        <div className="placeholder-text">Click to upload an image</div>
      )}
    </div>
  );
};

export default ImageBox;
