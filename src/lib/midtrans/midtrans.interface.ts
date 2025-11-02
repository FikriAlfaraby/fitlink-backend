export interface MidtransConfig {
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
}

export interface MidtransTransactionRequest {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  customer_details?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  item_details?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
  credit_card?: {
    secure?: boolean;
  };
  callbacks?: {
    finish?: string;
    error?: string;
    pending?: string;
  };
  expiry?: {
    start_time?: string;
    unit?: 'second' | 'minute' | 'hour' | 'day';
    duration?: number;
  };
  custom_field1?: string;
  custom_field2?: string;
  custom_field3?: string;
}

export interface MidtransTransactionResponse {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  currency: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status?: string;
  redirect_url?: string;
  token?: string;
}

export interface MidtransNotification {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: string;
  currency: string;
}

export interface MidtransTransactionStatus {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status?: string;
}

export enum MidtransTransactionStatusEnum {
  CAPTURE = 'capture',
  SETTLEMENT = 'settlement',
  PENDING = 'pending',
  DENY = 'deny',
  CANCEL = 'cancel',
  EXPIRE = 'expire',
  FAILURE = 'failure',
  REFUND = 'refund',
  PARTIAL_REFUND = 'partial_refund',
}

export enum MidtransFraudStatus {
  ACCEPT = 'accept',
  DENY = 'deny',
  CHALLENGE = 'challenge',
}