import React, { useState } from 'react';
import VideoShape, { ImageShape } from '@/components/VideoShape';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function VideoTestPage() {
  const [selectedShape, setSelectedShape] = useState<'heart' | 'cloud' | 'default'>('heart');
  const [progress, setProgress] = useState(0.3);

  // 테스트용 비디오/이미지 URL
  const sampleVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  const sampleImageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop';

  const handleProgressChange = (value: number) => {
    setProgress(value / 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎭 VideoShape 컴포넌트 테스트
          </h1>
          <p className="text-gray-600">
            하트/구름/기본 형태의 미디어와 재생 진행률 테스트
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎛️ 컨트롤
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Shape Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">모양 선택:</label>
                <div className="flex gap-2">
                  {(['heart', 'cloud', 'default'] as const).map((shape) => (
                    <Button
                      key={shape}
                      variant={selectedShape === shape ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedShape(shape)}
                      data-testid={`button-shape-${shape}`}
                    >
                      {shape === 'heart' && '💖'} 
                      {shape === 'cloud' && '☁️'} 
                      {shape === 'default' && '🔲'} 
                      {shape}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Progress Control */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  진행률: {Math.round(progress * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress * 100}
                  onChange={(e) => handleProgressChange(Number(e.target.value))}
                  className="w-full"
                  data-testid="slider-progress"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          
          {/* Video with External Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎬 비디오 (외부 진행률)</CardTitle>
              <Badge variant="secondary">External Progress Control</Badge>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <VideoShape
                src={sampleVideoUrl}
                shape={selectedShape}
                progress={progress}
                controls={false}
                autoPlay={false}
                data-testid="video-external-progress"
              />
              <p className="text-sm text-gray-600 text-center">
                슬라이더로 진행률 제어
              </p>
            </CardContent>
          </Card>

          {/* Video with Auto Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">▶️ 자동 재생 비디오</CardTitle>
              <Badge variant="outline">Auto Progress</Badge>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <VideoShape
                src={sampleVideoUrl}
                shape={selectedShape}
                autoPlay={true}
                muted={true}
                loop={true}
                onProgressUpdate={(prog) => console.log('Progress:', prog)}
                data-testid="video-auto-progress"
              />
              <p className="text-sm text-gray-600 text-center">
                클릭해서 재생/일시정지
              </p>
            </CardContent>
          </Card>

          {/* Image Shape */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🖼️ 이미지 형태</CardTitle>
              <Badge variant="destructive">No Progress Ring</Badge>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <ImageShape
                src={sampleImageUrl}
                alt="테스트 이미지"
                shape={selectedShape}
                data-testid="image-shape"
              />
              <p className="text-sm text-gray-600 text-center">
                정적 이미지 (진행률 없음)
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Size Variations */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>📏 크기 변형</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 justify-center">
              <div className="flex flex-col items-center gap-2">
                <VideoShape
                  src={sampleVideoUrl}
                  shape={selectedShape}
                  progress={0.7}
                  className="small"
                  autoPlay={false}
                  data-testid="video-small"
                />
                <Badge variant="outline" className="text-xs">Small (120px)</Badge>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <VideoShape
                  src={sampleVideoUrl}
                  shape={selectedShape}
                  progress={0.5}
                  className="medium"
                  autoPlay={false}
                  data-testid="video-medium"
                />
                <Badge variant="outline" className="text-xs">Medium (180px)</Badge>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <VideoShape
                  src={sampleVideoUrl}
                  shape={selectedShape}
                  progress={0.8}
                  className="large"
                  autoPlay={false}
                  data-testid="video-large"
                />
                <Badge variant="outline" className="text-xs">Large (300px)</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature List */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>✅ 구현된 기능</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold text-green-700">🎭 형태 지원</h4>
                <ul className="space-y-1 ml-4">
                  <li>• 하트 모양 (SVG 마스크)</li>
                  <li>• 구름 모양 (SVG 마스크)</li>
                  <li>• 기본 모양 (둥근 사각형)</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-700">⚡ 재생 기능</h4>
                <ul className="space-y-1 ml-4">
                  <li>• 자동 재생/일시정지</li>
                  <li>• 클릭으로 토글</li>
                  <li>• 진행률 실시간 표시</li>
                  <li>• 50ms 쓰로틀링</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-purple-700">🎨 UI/UX</h4>
                <ul className="space-y-1 ml-4">
                  <li>• 호버 시 재생 아이콘</li>
                  <li>• 부드러운 애니메이션</li>
                  <li>• 반응형 크기</li>
                  <li>• 다크모드 지원</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-orange-700">🔧 개발자 기능</h4>
                <ul className="space-y-1 ml-4">
                  <li>• 외부 진행률 제어</li>
                  <li>• 진행률 콜백</li>
                  <li>• 테스트 ID 지원</li>
                  <li>• TypeScript 완전 지원</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}