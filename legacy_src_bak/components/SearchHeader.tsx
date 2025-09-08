import { useState, useRef } from 'react';
import { Search, MapPin, Users } from 'lucide-react';

interface SearchHeaderProps {
  onLocationSearch: (query: string) => void;
  onContentSearch: (query: string) => void;
}

export default function SearchHeader({ onLocationSearch, onContentSearch }: SearchHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'location' | 'content'>('location');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchMode === 'location') {
      onLocationSearch(searchQuery);
    } else {
      onContentSearch(searchQuery);
    }
    setSearchQuery('');
    inputRef.current?.blur();
  };

  const toggleSearchMode = (mode: 'location' | 'content') => {
    setSearchMode(mode);
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{
      position: 'relative',
      padding: '16px',
      backgroundColor: 'white',
      borderBottom: '1px solid #e0e0e0',
      zIndex: 100
    }}>
      <form onSubmit={handleSearch} style={{ position: 'relative' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: '12px',
          padding: '8px 12px',
          gap: '8px'
        }}>
          {/* 검색 모드 선택 버튼 */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 8px',
              backgroundColor: searchMode === 'location' ? '#4ECDC4' : '#FF6B9D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              cursor: 'pointer',
              minWidth: '80px',
              justifyContent: 'center'
            }}
          >
            {searchMode === 'location' ? (
              <>
                <MapPin size={14} />
                장소
              </>
            ) : (
              <>
                <Users size={14} />
                컨텐츠
              </>
            )}
          </button>

          {/* 검색 입력창 */}
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchMode === 'location' 
                ? '주소, 지역, 명소 검색...' 
                : '키워드로 피드 검색...'
            }
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: 'transparent',
              outline: 'none',
              fontSize: '16px',
              color: '#2C3E50'
            }}
          />

          {/* 검색 버튼 */}
          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              backgroundColor: searchMode === 'location' ? '#4ECDC4' : '#FF6B9D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <Search size={16} />
          </button>
        </div>

        {/* 드롭다운 메뉴 */}
        {isDropdownOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            marginTop: '4px',
            overflow: 'hidden',
            zIndex: 1000
          }}>
            <button
              type="button"
              onClick={() => toggleSearchMode('location')}
              style={{
                width: '100%',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                backgroundColor: searchMode === 'location' ? '#f0f9ff' : 'white',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#2C3E50'
              }}
            >
              <MapPin size={16} color="#4ECDC4" />
              <div>
                <div style={{ fontWeight: 'bold' }}>장소 검색</div>
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                  주소, 지역, 도시, 명소, 가게명으로 검색
                </div>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => toggleSearchMode('content')}
              style={{
                width: '100%',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                backgroundColor: searchMode === 'content' ? '#fff0f5' : 'white',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#2C3E50'
              }}
            >
              <Users size={16} color="#FF6B9D" />
              <div>
                <div style={{ fontWeight: 'bold' }}>컨텐츠 검색</div>
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                  키워드로 다른 사람의 피드와 여행 정보 검색
                </div>
              </div>
            </button>
          </div>
        )}
      </form>

      {/* 배경 클릭으로 드롭다운 닫기 */}
      {isDropdownOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}