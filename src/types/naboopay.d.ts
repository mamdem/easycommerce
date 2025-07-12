declare module 'naboopay' {
  export class NabooPay {
    constructor(token: string);
    transaction: {
      create(request: TransactionRequest): Promise<TransactionResponse>;
      status(orderId: string): Promise<TransactionResponse>;
    };
  }

  export class TransactionRequest {
    constructor(options: {
      method_of_payment: Wallet[];
      products: ProductModel[];
    });
  }

  export class ProductModel {
    constructor(options: {
      name: string;
      category: string;
      amount: number;
      quantity: number;
      description: string;
    });
  }

  export interface TransactionResponse {
    order_id: string;
    method_of_payment: string[];
    amount: number;
    amount_to_pay: number;
    currency: string;
    created_at: string;
    transaction_status: string;
    is_escrow: boolean;
    is_merchant: boolean;
    checkout_url: string;
  }

  export enum Wallet {
    WAVE = 'WAVE',
    ORANGE_MONEY = 'ORANGE_MONEY',
    FREE_MONEY = 'FREE_MONEY'
  }
} 