import React from 'react';

interface PolicyRingProps {
  title: string;
  percentage: number;
  onClick: () => void;
  isClickable: boolean;
}

const PolicyRing: React.FC<PolicyRingProps> = ({ title, percentage, onClick, isClickable }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getRingColor = (p: number): string => {
    if (p >= 80) return 'stroke-teal-400';
    if (p >= 40) return 'stroke-yellow-400';
    return 'stroke-red-500';
  };
  
  const ringColor = getRingColor(percentage);

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`flex flex-col items-center justify-start p-2 rounded-lg transition-all duration-300 group ${isClickable ? 'cursor-pointer hover:bg-white/10' : 'opacity-70'}`}
    >
      <div className="relative w-24 h-24 mb-2">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none" strokeWidth="12"
            className="stroke-gray-700/50"
          />
          {/* Progress circle */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none" strokeWidth="12"
            className={`${ringColor} transition-all duration-500`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white group-hover:scale-110 transition-transform">
            {percentage}
            <span className="text-xs">%</span>
          </span>
        </div>
      </div>
      <h4 className="text-xs font-semibold text-center text-gray-300 group-hover:text-white transition-colors leading-tight" style={{ maxWidth: '120px', height: '40px' }}>
        {title}
      </h4>
    </div>
  );
};

export default PolicyRing;
