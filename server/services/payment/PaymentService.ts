// server/services/payment/PaymentService.ts
import type { IPaymentProvider } from './IPaymentProvider';

let _instance: IPaymentProvider | null = null;

export function getPaymentService(): IPaymentProvider {
  if (_instance) return _instance;

  const provider = process.env.PAYMENT_PROVIDER || 'paddle';

  if (provider === 'portone') {
    const { PortOneProvider } = require('./PortOneProvider');
    _instance = new PortOneProvider();
  } else {
    const { PaddleProvider } = require('./PaddleProvider');
    _instance = new PaddleProvider();
  }

  return _instance!;
}
