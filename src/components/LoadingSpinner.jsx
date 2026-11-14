import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ size = 'default', text = 'Loading...' }) => {
  const sizeMap = {
    small: 'w-4 h-4',
    default: 'w-7 h-7',
    large: 'w-10 h-10',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3 text-slate-500">
      <Loader2 className={`${sizeMap[size] || sizeMap.default} animate-spin text-blue-600`} />
      {text && <p className="text-sm font-medium text-slate-600">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
