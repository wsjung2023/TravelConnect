import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, MapPin, FileText } from 'lucide-react';

interface TimelineCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TimelineFormData) => void;
  fromFeed?: boolean; // 피드에서 왔는지 여부
}

interface TimelineFormData {
  title: string;
  destination: string;
  startDate: string;
  totalDays: number;
  description: string;
}

export default function TimelineCreateModal({ isOpen, onClose, onSubmit, fromFeed = false }: TimelineCreateModalProps) {
  const [formData, setFormData] = useState<TimelineFormData>({
    title: '',
    destination: '',
    startDate: '',
    totalDays: 1,
    description: ''
  });
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);

  useEffect(() => {
    if (isOpen && window.google?.maps?.places) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("타임라인 생성 폼 제출:", formData);
    
    if (!formData.title.trim()) {
      console.log("제목이 비어있음");
      return;
    }
    if (!formData.destination.trim()) {
      console.log("목적지가 비어있음");
      return;
    }
    if (!formData.startDate) {
      console.log("시작일이 비어있음");
      return;
    }
    
    console.log("폼 유효성 검사 통과, onSubmit 호출");
    onSubmit(formData);
    
    // 폼 리셋
    setFormData({
      title: '',
      destination: '',
      startDate: '',
      totalDays: 1,
      description: ''
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          console.log("타임라인 생성 모달 배경 클릭으로 닫기", fromFeed ? "- 피드로 돌아가기" : "- 뒤로 가기");
          onClose();
          if (fromFeed) {
            // 피드에서 온 경우 피드로 돌아가기
            window.postMessage({ type: 'timeline-created-return-to-feed' }, '*');
          } else {
            // 타임라인에서 온 경우 뒤로 가기
            window.history.back();
          }
        }
      }}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">새 타임라인 만들기</h2>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("타임라인 생성 모달 X 버튼 클릭", fromFeed ? "- 피드로 돌아가기" : "- 뒤로 가기");
              onClose();
              if (fromFeed) {
                // 피드에서 온 경우 피드로 돌아가기
                window.postMessage({ type: 'timeline-created-return-to-feed' }, '*');
              } else {
                // 타임라인에서 온 경우 뒤로 가기
                window.history.back();
              }
            }} 
            className="p-1 hover:bg-gray-100 rounded-full"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              타임라인 제목 *
            </label>
            <input
              id="title"
              type="text"
              placeholder="예: 일본 도쿄 여행"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div className="relative">
            <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
              여행 목적지 *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                id="destination"
                type="text"
                placeholder="예: 도쿄, 일본 또는 서울, 대한민국"
                value={formData.destination}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ ...prev, destination: value }));
                  
                  if (value.length > 2 && autocompleteService.current) {
                    autocompleteService.current.getPlacePredictions(
                      { input: value, types: ['(cities)'] },
                      (predictions, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                          setPredictions(predictions);
                          setShowPredictions(true);
                        }
                      }
                    );
                  } else {
                    setShowPredictions(false);
                  }
                }}
                onFocus={() => formData.destination.length > 2 && setShowPredictions(true)}
                onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
                autoComplete="off"
              />
            </div>
            
            {/* Autocomplete Dropdown */}
            {showPredictions && predictions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {predictions.map((prediction, index) => (
                  <div
                    key={prediction.place_id}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, destination: prediction.description }));
                      setShowPredictions(false);
                    }}
                  >
                    {prediction.description}
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-1">
              도시명과 국가명을 함께 입력해주세요 (예: 파리, 프랑스)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                시작일 *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="totalDays" className="block text-sm font-medium text-gray-700 mb-1">
                여행 기간
              </label>
              <input
                id="totalDays"
                type="number"
                min="1"
                max="365"
                value={formData.totalDays}
                onChange={(e) => setFormData(prev => ({ ...prev, totalDays: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-xs text-gray-500 mt-1">{formData.totalDays}일</p>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              여행 설명
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400" size={16} />
              <textarea
                id="description"
                placeholder="이번 여행에 대한 간단한 설명을 적어주세요..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[80px] resize-none"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("타임라인 생성 모달 취소", fromFeed ? "- 피드로 돌아가기" : "- 뒤로 가기");
                onClose();
                if (fromFeed) {
                  // 피드에서 온 경우 피드로 돌아가기
                  window.postMessage({ type: 'timeline-created-return-to-feed' }, '*');
                } else {
                  // 타임라인에서 온 경우 뒤로 가기
                  window.history.back();
                }
              }}
            >
              취소
            </button>
            <button 
              type="submit" 
              className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors disabled:opacity-50"
              disabled={!formData.title.trim() || !formData.destination.trim() || !formData.startDate}
              onClick={(e) => {
                console.log("타임라인 생성 버튼 클릭");
              }}
            >
              타임라인 생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}