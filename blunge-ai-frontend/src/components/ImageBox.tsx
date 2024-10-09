import React from 'react';

type ImageBoxProps = {
  imageUrl: string | null;
  isSegmentView: boolean;
};

const ImageBox: React.FC<ImageBoxProps> = ({ imageUrl }) => {
  return (
    <div className="image-box">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Uploaded"
          style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}  // Constrain image size
        />
      ) : (
        <div className="placeholder-text">Click to upload an image</div>
      )}
    </div>
  );
};

export default ImageBox;
