import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'wouter';
import { ExternalLink, AlertCircle } from 'lucide-react';

interface PaymentAgreementProps {
  totalAmount: number;
  onAgreementChange: (isValid: boolean) => void;
  showAmountConfirm?: boolean;
}

export default function PaymentAgreement({
  totalAmount,
  onAgreementChange,
  showAmountConfirm = true,
}: PaymentAgreementProps) {
  const [agreements, setAgreements] = useState({
    amount: false,
    refundPolicy: false,
    terms: false,
    thirdPartyData: false,
  });

  const [allChecked, setAllChecked] = useState(false);

  const requiredAgreements = showAmountConfirm 
    ? ['amount', 'refundPolicy', 'terms', 'thirdPartyData'] as const
    : ['refundPolicy', 'terms', 'thirdPartyData'] as const;

  useEffect(() => {
    const isValid = requiredAgreements.every(
      (key) => agreements[key as keyof typeof agreements]
    );
    onAgreementChange(isValid);
  }, [agreements, onAgreementChange]);

  const handleAllCheck = (checked: boolean) => {
    setAllChecked(checked);
    const newAgreements = {
      amount: checked,
      refundPolicy: checked,
      terms: checked,
      thirdPartyData: checked,
    };
    setAgreements(newAgreements);
  };

  const handleSingleCheck = (key: keyof typeof agreements, checked: boolean) => {
    const newAgreements = { ...agreements, [key]: checked };
    setAgreements(newAgreements);
    const allNowChecked = Object.values(newAgreements).every((v) => v);
    setAllChecked(allNowChecked);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white mb-2">
        <AlertCircle size={16} className="text-amber-500" />
        결제 전 필수 동의사항
      </div>

      <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <Checkbox
          id="all-agree"
          checked={allChecked}
          onCheckedChange={(checked) => handleAllCheck(checked === true)}
          data-testid="checkbox-all-agree"
        />
        <label
          htmlFor="all-agree"
          className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer"
        >
          전체 동의
        </label>
      </div>

      <div className="space-y-2.5 pt-1">
        {showAmountConfirm && (
          <div className="flex items-start gap-3">
            <Checkbox
              id="agree-amount"
              checked={agreements.amount}
              onCheckedChange={(checked) =>
                handleSingleCheck('amount', checked === true)
              }
              data-testid="checkbox-agree-amount"
            />
            <label
              htmlFor="agree-amount"
              className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer leading-relaxed"
            >
              <span className="text-red-500 mr-1">[필수]</span>
              결제 금액{' '}
              <span className="font-semibold text-primary">
                ₩{totalAmount.toLocaleString()}
              </span>
              을 확인했습니다
            </label>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Checkbox
            id="agree-refund"
            checked={agreements.refundPolicy}
            onCheckedChange={(checked) =>
              handleSingleCheck('refundPolicy', checked === true)
            }
            data-testid="checkbox-agree-refund"
          />
          <label
            htmlFor="agree-refund"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer leading-relaxed flex items-center gap-1"
          >
            <span className="text-red-500 mr-1">[필수]</span>
            <Link 
              href="/legal/refund" 
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              환불 정책 <ExternalLink size={12} />
            </Link>
            에 동의합니다
          </label>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="agree-terms"
            checked={agreements.terms}
            onCheckedChange={(checked) =>
              handleSingleCheck('terms', checked === true)
            }
            data-testid="checkbox-agree-terms"
          />
          <label
            htmlFor="agree-terms"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer leading-relaxed flex items-center gap-1"
          >
            <span className="text-red-500 mr-1">[필수]</span>
            <Link 
              href="/legal/terms" 
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              서비스 이용약관 <ExternalLink size={12} />
            </Link>
            에 동의합니다
          </label>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="agree-thirdparty"
            checked={agreements.thirdPartyData}
            onCheckedChange={(checked) =>
              handleSingleCheck('thirdPartyData', checked === true)
            }
            data-testid="checkbox-agree-thirdparty"
          />
          <label
            htmlFor="agree-thirdparty"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer leading-relaxed"
          >
            <span className="text-red-500 mr-1">[필수]</span>
            결제 진행을 위한 개인정보 제3자 제공에 동의합니다
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              (PG사: 결제 처리, 로컬가이드: 서비스 제공)
            </span>
          </label>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700 mt-3">
        위 사항에 동의하지 않으면 결제를 진행할 수 없습니다.
        자세한 내용은{' '}
        <Link 
          href="/legal/privacy" 
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          개인정보 처리방침
        </Link>
        을 확인해주세요.
      </p>
    </div>
  );
}
