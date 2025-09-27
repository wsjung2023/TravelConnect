import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

interface CustomMapMarkerProps {
  type: 'tour' | 'food' | 'activity' | 'tip';
  count?: number;
  theme?: string;
}

export const CustomMapMarker: React.FC<CustomMapMarkerProps> = ({
  type,
  count = 1,
  theme,
}) => {
  const { t } = useTranslation();
  // DB에서 테마 색상 설정 가져오기
  const { data: themeColorsData } = useQuery({
    queryKey: ['/api/public/settings/ui/theme_colors'],
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });

  const getMarkerColor = () => {
    // DB에서 가져온 색상 사용, 없으면 하드코딩된 기본값 사용
    let themeColors: Record<string, string> = {
      restaurant: '#FF6B9D',
      tourist_attraction: '#4ECDC4',
      landmark: '#4ECDC4',
      party: '#FF4757',
      hotplace: '#FFA726',
      healing: '#66BB6A',
      tour: '#4ECDC4',
      food: '#FF6B9D',
      activity: '#FF4757',
      tip: '#66BB6A',
      default: '#9C88FF',
    };

    // DB 데이터가 있으면 사용
    if (themeColorsData?.value) {
      try {
        const dbColors = JSON.parse(themeColorsData.value);
        themeColors = { ...themeColors, ...dbColors };
      } catch (error) {
        console.warn(t('app.error'), error);
      }
    }

    if (theme && theme in themeColors) {
      return themeColors[theme];
    }

    if (type in themeColors) {
      return themeColors[type];
    }

    return themeColors.default || '#9C88FF';
  };

  const color = getMarkerColor();

  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
    >
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
