// 가장 간단한 SlotBrowser 컴포넌트
export default function SlotBrowser() {
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6" data-testid="slot-browser">
      <h1 className="text-2xl font-bold">SlotBrowser 컴포넌트</h1>
      <p>이것은 가장 간단한 SlotBrowser 테스트입니다.</p>
      <div data-testid="slots-grid">
        <p>슬롯 그리드 영역</p>
      </div>
    </div>
  );
}