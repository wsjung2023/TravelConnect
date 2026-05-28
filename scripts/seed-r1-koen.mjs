// R1 한국어/영어 시드 — 변환된 키들의 ko/en 값을 DB에 박는다. 그 다음 i18n-sync.mjs가 ja/zh/fr/es 자동 채움.
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const NS = 'ui';
const entries = [
  // slotForm.*
  ['slotForm.titleLabel', '제목 *', 'Title *'],
  ['slotForm.titlePlaceholder', '예: 홍대 맛집 투어', 'e.g. Hongdae Food Tour'],
  ['slotForm.descLabel', '설명', 'Description'],
  ['slotForm.descPlaceholder', '슬롯에 대한 자세한 설명을 입력하세요...', 'Enter a detailed description of the slot...'],
  ['slotForm.dateLabel', '날짜 *', 'Date *'],
  ['slotForm.dateSelect', '날짜 선택', 'Pick a date'],
  ['slotForm.timezoneLabel', '시간대 *', 'Timezone *'],
  ['slotForm.timezoneSelect', '시간대 선택', 'Select timezone'],
  ['slotForm.startTimeLabel', '시작 시간 *', 'Start Time *'],
  ['slotForm.endTimeLabel', '종료 시간 *', 'End Time *'],
  ['slotForm.categoryLabel', '카테고리 *', 'Category *'],
  ['slotForm.categorySelect', '카테고리 선택', 'Select category'],
  ['slotForm.serviceTypeLabel', '서비스 타입 *', 'Service Type *'],
  ['slotForm.serviceTypeSelect', '서비스 타입 선택', 'Select service type'],
  ['slotForm.locationLabel', '위치', 'Location'],
  ['slotForm.locationPlaceholder', '예: 서울특별시 마포구 홍대입구역', 'e.g. Hongdae Station, Mapo-gu, Seoul'],
  ['slotForm.maxParticipantsLabel', '최대 참가자 *', 'Max Participants *'],
  ['slotForm.priceLabel', '가격 (KRW) *', 'Price (KRW) *'],
  ['slotForm.requiresApprovalLabel', '승인 필요', 'Requires Approval'],
  ['slotForm.requiresApprovalDesc', '예약 시 수동 승인이 필요합니다', 'Reservations need manual approval'],
  ['slotForm.autoConfirmLabel', '자동 확정', 'Auto Confirm'],
  ['slotForm.autoConfirmDesc', '예약 시 자동으로 확정됩니다', 'Reservations are automatically confirmed'],
  ['slotForm.cancellationLabel', '취소 정책', 'Cancellation Policy'],
  ['slotForm.cancellationPlaceholder', '취소 정책을 입력하세요...', 'Enter cancellation policy...'],
  ['slotForm.cancel', '취소', 'Cancel'],
  ['slotForm.save', '저장', 'Save'],
  ['slotForm.saving', '저장 중...', 'Saving...'],

  // slotManagement.*
  ['slotManagement.empty', '아직 생성된 슬롯이 없습니다.', 'No slots created yet.'],
  ['slotManagement.emptyHint', '첫 번째 슬롯을 생성해보세요!', 'Create your first slot!'],

  // serviceTemplate.*
  ['serviceTemplate.typeLabel', '템플릿 종류', 'Template Type'],
  ['serviceTemplate.typePlaceholder', '제공하고 싶은 서비스 종류를 선택하세요', 'Select the type of service you want to offer'],
  ['serviceTemplate.titleLabel', '템플릿 제목', 'Template Title'],
  ['serviceTemplate.titlePlaceholder', '예: 부산 현지인 맛집 투어', 'e.g. Local Busan Food Tour'],
  ['serviceTemplate.priceLabel', '기본 가격 (원)', 'Base Price (KRW)'],
  ['serviceTemplate.descLabel', '상세 설명', 'Description'],
  ['serviceTemplate.descPlaceholder', '이 템플릿으로 어떤 서비스를 제공하는지 자세히 설명해주세요...', 'Describe in detail what service you provide with this template...'],
  ['serviceTemplate.durationLabel', '예상 소요 시간 (시간)', 'Estimated Duration (hours)'],
  ['serviceTemplate.maxParticipantsLabel', '최대 참가자 수', 'Max Participants'],
  ['serviceTemplate.includesLabel', '포함 사항', "What's Included"],
  ['serviceTemplate.includesPlaceholder', '예: 맛집 리스트, 예약 대행', 'e.g. Restaurant list, reservation service'],
  ['serviceTemplate.requirementsLabel', '필수 조건', 'Requirements'],
  ['serviceTemplate.requirementsPlaceholder', '예: 사전 예약 필수, 현금 준비', 'e.g. Advance reservation required, cash ready'],
  ['serviceTemplate.samplesLabel', '샘플 결과물', 'Sample Deliverables'],
  ['serviceTemplate.samplesPlaceholder', '예: 개인별 맞춤 맛집 지도, 예약 확정서', 'e.g. Personalized food map, reservation confirmation'],

  // servicePackage.*
  ['servicePackage.titleLabel', '패키지 제목', 'Package Title'],
  ['servicePackage.titlePlaceholder', '예: 부산 완전정복 패키지', 'e.g. Complete Busan Package'],
  ['servicePackage.descLabel', '패키지 설명', 'Package Description'],
  ['servicePackage.descPlaceholder', '이 패키지에 포함된 서비스들과 특별한 혜택을 설명해주세요...', 'Describe the services included in this package and special benefits...'],
  ['servicePackage.totalPriceLabel', '총 가격 (원)', 'Total Price (KRW)'],
  ['servicePackage.discountLabel', '할인율 (%)', 'Discount (%)'],
  ['servicePackage.addItemPlaceholder', '서비스/템플릿 추가', 'Add service/template'],
  ['servicePackage.emptyText', '패키지에 포함할 서비스나 템플릿을 선택해주세요', 'Please select services or templates to include in the package'],

  // purchaseProxy.*
  ['purchaseProxy.requestButton', '구매 요청하기', 'Request Purchase'],
  ['purchaseProxy.requestTitle', '구매 요청 생성', 'Create Purchase Request'],
  ['purchaseProxy.productNameLabel', '상품명 *', 'Product Name *'],
  ['purchaseProxy.productNamePlaceholder', '구매하고 싶은 상품명을 입력하세요', 'Enter the name of the product you want to buy'],
  ['purchaseProxy.productDescLabel', '상품 설명', 'Product Description'],
  ['purchaseProxy.productDescPlaceholder', '상품에 대한 자세한 설명을 입력하세요', 'Enter a detailed description of the product'],
  ['purchaseProxy.productUrlLabel', '상품 링크', 'Product Link'],
  ['purchaseProxy.productUrlPlaceholder', '상품 구매 링크 (선택사항)', 'Product purchase link (optional)'],
  ['purchaseProxy.estimatedPriceLabel', '예상 가격 *', 'Estimated Price *'],
  ['purchaseProxy.quantityLabel', '수량 *', 'Quantity *'],
  ['purchaseProxy.urgencyLabel', '긴급도', 'Urgency'],
  ['purchaseProxy.urgencyPlaceholder', '긴급도를 선택하세요', 'Select urgency'],
  ['purchaseProxy.urgencyUrgent', '긴급', 'Urgent'],
  ['purchaseProxy.urgencyNormal', '보통', 'Normal'],
  ['purchaseProxy.urgencyFlexible', '여유있음', 'Flexible'],
  ['purchaseProxy.deliveryAddressLabel', '배송 주소 *', 'Delivery Address *'],
  ['purchaseProxy.deliveryAddressPlaceholder', '배송받을 주소를 입력하세요', 'Enter the delivery address'],
  ['purchaseProxy.specialLabel', '특별 요청사항', 'Special Instructions'],
  ['purchaseProxy.specialPlaceholder', '특별한 요청사항이 있으면 입력하세요', 'Enter any special instructions'],
  ['purchaseProxy.submittingRequest', '생성 중...', 'Creating...'],
  ['purchaseProxy.submitRequest', '구매 요청 보내기', 'Send Purchase Request'],
  ['purchaseProxy.sendQuote', '견적 보내기', 'Send Quote'],
  ['purchaseProxy.quoteTitle', '견적서 작성', 'Create Quote'],
  ['purchaseProxy.productPriceLabel', '상품 가격 *', 'Product Price *'],
  ['purchaseProxy.productPricePlaceholder', '실제 상품 가격', 'Actual product price'],
  ['purchaseProxy.commissionLabel', '수수료 *', 'Commission *'],
  ['purchaseProxy.commissionPlaceholder', '구매대행 수수료', 'Purchase service fee'],
  ['purchaseProxy.shippingLabel', '배송비 *', 'Shipping Fee *'],
  ['purchaseProxy.shippingPlaceholder', '국제배송비', 'International shipping fee'],
  ['purchaseProxy.totalLabel', '총 가격 *', 'Total Price *'],
  ['purchaseProxy.totalPlaceholder', '총 결제 금액', 'Total payment amount'],
  ['purchaseProxy.estimatedDeliveryLabel', '예상 배송 기간 *', 'Estimated Delivery *'],
  ['purchaseProxy.estimatedDeliveryPlaceholder', '3-5일', '3-5 days'],
  ['purchaseProxy.paymentMethodLabel', '결제 방법 *', 'Payment Method *'],
  ['purchaseProxy.paymentMethodPlaceholder', 'PayPal, 은행송금 등', 'PayPal, bank transfer, etc.'],
  ['purchaseProxy.validUntilLabel', '견적 유효 기간 *', 'Quote Valid Until *'],
  ['purchaseProxy.notesLabel', '추가 메모', 'Additional Notes'],
  ['purchaseProxy.notesPlaceholder', '견적에 대한 추가 설명', 'Additional notes about the quote'],
  ['purchaseProxy.submittingQuote', '생성 중...', 'Creating...'],
  ['purchaseProxy.submitQuote', '견적서 보내기', 'Send Quote'],
  ['purchaseProxy.trackingNumber', '배송 추적번호', 'Tracking Number'],

  // mapComponent.*
  ['mapComponent.searchApiError', '검색 API 오류', 'Search API error'],
  ['mapComponent.seoul', '서울특별시', 'Seoul'],
  ['mapComponent.searchPlaceholder', '제목이나 내용으로 검색...', 'Search by title or content...'],
  ['mapComponent.filterAllUsers', '전체 사용자', 'All users'],
  ['mapComponent.filterSpecificUser', '특정 사용자', 'Specific user'],
  ['mapComponent.filterAllPeriod', '전체 기간', 'All time'],
  ['mapComponent.filterWeek', '최근 1주일', 'Last 7 days'],
  ['mapComponent.filterMonth', '최근 1개월', 'Last 30 days'],
  ['mapComponent.meetTitlePlaceholder', '예: 커피 한 잔 하실래요?', 'e.g. Want to grab a coffee?'],
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
console.log(`✅ R1 ko/en seed 완료: ${inserted}개 신규 행 삽입 (${entries.length} keys × 2 locales)`);
