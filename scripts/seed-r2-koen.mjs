// R2 한국어/영어 시드 — purchase-proxy.tsx 잔여 키 ko/en 박기. 이후 i18n-sync.mjs가 ja/zh/fr/es 자동 채움.
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const NS = 'ui';
const entries = [
  // 헤더/탭
  ['purchaseProxy.pageTitle', '구매대행 서비스', 'Purchase Proxy Service'],
  ['purchaseProxy.pageDescription', '현지 쇼핑 전문가들과 함께하는 안전한 구매대행 서비스', 'A safe purchase proxy service with local shopping experts'],
  ['purchaseProxy.tabServices', '서비스 찾기', 'Find Services'],
  ['purchaseProxy.tabMyRequests', '내 요청', 'My Requests'],
  ['purchaseProxy.tabReceivedRequests', '받은 요청', 'Received Requests'],
  ['purchaseProxy.tabOrders', '주문 관리', 'Manage Orders'],
  ['purchaseProxy.sectionServices', '구매대행 서비스', 'Purchase Proxy Services'],
  ['purchaseProxy.sectionMyRequests', '내가 보낸 구매 요청', 'Purchase Requests I Sent'],
  ['purchaseProxy.sectionReceivedRequests', '받은 구매 요청', 'Received Purchase Requests'],
  ['purchaseProxy.sectionOrders', '주문 관리', 'Manage Orders'],
  ['purchaseProxy.subTabBuyerOrders', '구매 주문', 'Buyer Orders'],
  ['purchaseProxy.subTabSellerOrders', '판매 주문', 'Seller Orders'],

  // 서비스 카드
  ['purchaseProxy.specialtyAreas', '전문 분야:', 'Specialty Areas:'],
  ['purchaseProxy.reviewCount', '({{count}}개 리뷰)', '({{count}} reviews)'],
  ['purchaseProxy.commission', '수수료: {{rate}}', 'Commission: {{rate}}'],

  // 다이얼로그 설명
  ['purchaseProxy.requestDialogDesc', '{{name}}에게 구매 요청을 보냅니다', 'Sending a purchase request to {{name}}'],
  ['purchaseProxy.quoteDialogDesc', '{{name}}에 대한 견적을 작성합니다', 'Writing a quote for {{name}}'],

  // 요청/주문 카드
  ['purchaseProxy.qtyAndEstimate', '수량: {{quantity}}개 • 예상가격: {{currency}} {{price}}', 'Qty: {{quantity}} • Est. price: {{currency}} {{price}}'],
  ['purchaseProxy.requestDate', '요청일: {{date}}', 'Requested: {{date}}'],
  ['purchaseProxy.orderNumber', '주문번호: {{number}}', 'Order #: {{number}}'],
  ['purchaseProxy.totalAmount', '총 금액: {{amount}}', 'Total: {{amount}}'],
  ['purchaseProxy.paymentLabel', '결제: {{status}}', 'Payment: {{status}}'],
  ['purchaseProxy.orderDate', '주문일: {{date}}', 'Ordered: {{date}}'],

  // 빈 상태
  ['purchaseProxy.emptyMyRequests', '아직 보낸 구매 요청이 없습니다', 'You have not sent any purchase requests yet'],
  ['purchaseProxy.emptyReceivedRequests', '아직 받은 구매 요청이 없습니다', 'You have not received any purchase requests yet'],
  ['purchaseProxy.emptyBuyerOrders', '아직 구매 주문이 없습니다', 'No buyer orders yet'],
  ['purchaseProxy.emptySellerOrders', '아직 판매 주문이 없습니다', 'No seller orders yet'],

  // 토스트
  ['purchaseProxy.toastRequestSuccess', '구매 요청이 생성되었습니다', 'Purchase request created'],
  ['purchaseProxy.toastRequestFail', '구매 요청 생성 실패', 'Failed to create purchase request'],
  ['purchaseProxy.toastQuoteSuccess', '견적이 생성되었습니다', 'Quote created'],
  ['purchaseProxy.toastQuoteFail', '견적 생성 실패', 'Failed to create quote'],

  // 상태 라벨
  ['purchaseProxy.statusPending', '대기중', 'Pending'],
  ['purchaseProxy.statusQuoted', '견적됨', 'Quoted'],
  ['purchaseProxy.statusAccepted', '승인됨', 'Accepted'],
  ['purchaseProxy.statusCompleted', '완료', 'Completed'],
  ['purchaseProxy.statusCancelled', '취소됨', 'Cancelled'],

  // 폼 검증 메시지
  ['purchaseProxy.validationProductName', '상품명을 입력해주세요', 'Please enter the product name'],
  ['purchaseProxy.validationEstimatedPrice', '예상 가격을 입력해주세요', 'Please enter the estimated price'],
  ['purchaseProxy.validationQuantity', '수량은 1개 이상이어야 합니다', 'Quantity must be at least 1'],
  ['purchaseProxy.validationDeliveryAddress', '배송 주소를 입력해주세요', 'Please enter the delivery address'],
  ['purchaseProxy.validationProductPrice', '상품 가격을 입력해주세요', 'Please enter the product price'],
  ['purchaseProxy.validationCommission', '수수료를 입력해주세요', 'Please enter the commission fee'],
  ['purchaseProxy.validationShipping', '배송비를 입력해주세요', 'Please enter the shipping fee'],
  ['purchaseProxy.validationTotalPrice', '총 가격을 입력해주세요', 'Please enter the total price'],
  ['purchaseProxy.validationEstimatedDelivery', '예상 배송 기간을 입력해주세요', 'Please enter the estimated delivery period'],
  ['purchaseProxy.validationPaymentMethod', '결제 방법을 입력해주세요', 'Please enter the payment method'],
  ['purchaseProxy.validationValidUntil', '견적 유효 기간을 입력해주세요', 'Please enter the quote valid-until date'],
];

let inserted = 0;
for (const [key, ko, en] of entries) {
  for (const [locale, value] of [['ko', ko], ['en', en]]) {
    const r = await sql`
      INSERT INTO translations (namespace, key, locale, value, is_reviewed, version)
      VALUES (${NS}, ${key}, ${locale}, ${value}, false, 1)
      ON CONFLICT (namespace, key, locale) DO NOTHING
      RETURNING id
    `;
    if (r.length > 0) inserted++;
  }
}
console.log(`✅ R2 ko/en seed 완료: ${inserted}개 신규 행 삽입 (${entries.length} keys × 2 locales)`);
