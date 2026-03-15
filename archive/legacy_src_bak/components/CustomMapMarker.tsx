import React from 'react';

interface CustomMapMarkerProps {
  type: 'tour' | 'food' | 'activity' | 'tip';
  count?: number;
  theme?: string;
}

export const CustomMapMarker: React.FC<CustomMapMarkerProps> = ({ type, count = 1, theme }) => {
  const getMarkerColor = () => {
    const themeColors = {
      '맛집': '#FF6B9D',
      '명소': '#4ECDC4',
      '파티타임': '#FF4757', 
      '핫플레이스': '#FFA726',
      '힐링': '#66BB6A'
    } as const;

    if (theme && theme in themeColors) {
      return themeColors[theme as keyof typeof themeColors];
    }

    switch (type) {
      case 'tour': return '#4ECDC4';
      case 'food': return '#FF6B9D';
      case 'activity': return '#FF4757';
      case 'tip': return '#66BB6A';
      default: return '#9C88FF';
    }
  };

  const color = getMarkerColor();

  return (
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle 
        cx="20" 
        cy="20" 
        r="18" 
        fill={color} 
        stroke="white" 
        strokeWidth="3"
      />
      <text 
        x="20" 
        y="26" 
        textAnchor="middle" 
        fill="white" 
        fontSize="14" 
        fontWeight="bold" 
        fontFamily="Arial"
      >
        {count}
      </text>
    </svg>
  );
};

export default CustomMapMarker;