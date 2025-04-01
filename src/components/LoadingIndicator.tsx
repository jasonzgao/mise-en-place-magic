
import React from 'react';

type LoadingIndicatorProps = {
  message?: string;
};

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = 'Processing recipe...' 
}) => {
  return (
    <div className="loading-indicator">
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
};

export default LoadingIndicator;
