import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MidtransService } from './midtrans.service';
import { MidtransTransactionRequest, MidtransNotification } from './midtrans.interface';
import * as midtransClient from 'midtrans-client';
import * as crypto from 'crypto';

// Mock midtrans-client
jest.mock('midtrans-client');
const mockMidtransClient = midtransClient as jest.Mocked<typeof midtransClient>;

// We don't mock crypto as it's used internally by NestJS

describe('MidtransService', () => {
  let service: MidtransService;
  let configService: ConfigService;
  let mockSnap: any;
  let mockCoreApi: any;

  const mockConfig = {
    serverKey: 'test-server-key',
    clientKey: 'test-client-key',
    isProduction: false,
  };

  beforeEach(async () => {
    // Mock Snap and CoreApi instances
    mockSnap = {
      createTransaction: jest.fn(),
    };
    mockCoreApi = {
      transaction: {
        refund: jest.fn(),
        cancel: jest.fn(),
        status: jest.fn(),
      },
      cancel: jest.fn(),
      refund: jest.fn(),
    };

    // Mock midtrans-client constructors
    mockMidtransClient.Snap = jest.fn().mockImplementation(() => mockSnap);
    mockMidtransClient.CoreApi = jest.fn().mockImplementation(() => mockCoreApi);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MidtransService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'MIDTRANS_SERVER_KEY': mockConfig.serverKey,
                'MIDTRANS_CLIENT_KEY': mockConfig.clientKey,
                'MIDTRANS_IS_PRODUCTION': mockConfig.isProduction,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MidtransService>(MidtransService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSnapTransaction', () => {
    it('should create a snap transaction successfully', async () => {
      const transactionRequest: MidtransTransactionRequest = {
        transaction_details: {
          order_id: 'order-123',
          gross_amount: 100000,
        },
        customer_details: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '08123456789',
        },
        item_details: [
          {
            id: 'item-1',
            price: 100000,
            quantity: 1,
            name: 'Test Item',
          },
        ],
      };

      const mockSnapResponse = {
        token: 'snap-token-123',
        redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-123',
      };

      const expectedResponse = {
        status_code: '201',
        status_message: 'Success, snap token is created',
        transaction_id: 'snap-token-123',
        order_id: 'order-123',
        merchant_id: '',
        gross_amount: '100000',
        currency: 'IDR',
        payment_type: 'snap',
        transaction_time: expect.any(String),
        transaction_status: 'pending',
        token: 'snap-token-123',
        redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-123',
      };

      mockSnap.createTransaction.mockResolvedValue(mockSnapResponse);

      const result = await service.createSnapTransaction(transactionRequest);

      expect(mockSnap.createTransaction).toHaveBeenCalledWith(transactionRequest);
      expect(result).toEqual(expectedResponse);
    });

    it('should throw error when snap transaction creation fails', async () => {
      const transactionRequest: MidtransTransactionRequest = {
        transaction_details: {
          order_id: 'order-123',
          gross_amount: 100000,
        },
      };

      const mockError = new Error('Midtrans API Error');
      mockSnap.createTransaction.mockRejectedValue(mockError);

      await expect(service.createSnapTransaction(transactionRequest)).rejects.toThrow('Midtrans API Error');
    });
  });

  describe('getTransactionStatus', () => {
    it('should get transaction status successfully', async () => {
      const orderId = 'order-123';
      const mockResponse = {
        status_code: '200',
        status_message: 'Success, transaction found',
        transaction_id: 'trans-123',
        order_id: orderId,
        transaction_status: 'settlement',
        transaction_time: '2023-01-01 10:00:00',
        gross_amount: '100000.00',
      };

      mockCoreApi.transaction.status.mockResolvedValue(mockResponse);

      const result = await service.getTransactionStatus(orderId);

      expect(mockCoreApi.transaction.status).toHaveBeenCalledWith(orderId);
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when getting transaction status fails', async () => {
      const orderId = 'order-123';
      const mockError = new Error('Transaction not found');
      mockCoreApi.transaction.status.mockRejectedValue(mockError);

      await expect(service.getTransactionStatus(orderId)).rejects.toThrow('Transaction not found');
    });
  });

  describe('verifyNotificationSignature', () => {
    it('should verify notification signature successfully', () => {
      const notification: MidtransNotification = {
        order_id: 'order-123',
        status_code: '200',
        gross_amount: '100000.00',
        signature_key: 'test-signature',
        transaction_status: 'settlement',
        transaction_time: '2023-01-01 10:00:00',
        transaction_id: 'trans-123',
        status_message: 'Success',
        payment_type: 'credit_card',
        merchant_id: 'merchant-123',
        currency: 'IDR',
      };

      const expectedSignature = 'test-signature';
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(expectedSignature),
      };

      const createHashSpy = jest.spyOn(crypto, 'createHash').mockReturnValue(mockHash as any);

      const result = service.verifyNotificationSignature(notification);

      expect(createHashSpy).toHaveBeenCalledWith('sha512');
      expect(mockHash.update).toHaveBeenCalledWith(`${notification.order_id}${notification.status_code}${notification.gross_amount}${mockConfig.serverKey}`);
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const notification: MidtransNotification = {
        order_id: 'order-123',
        status_code: '200',
        gross_amount: '100000.00',
        signature_key: 'invalid-signature',
        transaction_status: 'settlement',
        transaction_time: '2023-01-01 10:00:00',
        transaction_id: 'trans-123',
        status_message: 'Success',
        payment_type: 'credit_card',
        merchant_id: 'merchant-123',
        currency: 'IDR',
      };

      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('valid-signature'),
      };

      jest.spyOn(crypto, 'createHash').mockReturnValue(mockHash as any);

      const result = service.verifyNotificationSignature(notification);

      expect(result).toBe(false);
    });
  });

  describe('processNotification', () => {
    it('should process notification and return transaction status', async () => {
      const notification: MidtransNotification = {
        order_id: 'order-123',
        status_code: '200',
        gross_amount: '100000.00',
        signature_key: 'test-signature',
        transaction_status: 'settlement',
        transaction_time: '2023-01-01 10:00:00',
        transaction_id: 'trans-123',
        status_message: 'Success',
        payment_type: 'credit_card',
        merchant_id: 'merchant-123',
        currency: 'IDR',
      };

      const mockTransactionStatus = {
        status_code: '200',
        transaction_status: 'settlement',
        order_id: 'order-123',
      };

      // Mock signature verification
      jest.spyOn(service, 'verifyNotificationSignature').mockReturnValue(true);
      mockCoreApi.transaction.status.mockResolvedValue(mockTransactionStatus);

      const result = await service.processNotification(notification);

      expect(service.verifyNotificationSignature).toHaveBeenCalledWith(notification);
      expect(mockCoreApi.transaction.status).toHaveBeenCalledWith(notification.order_id);
      expect(result).toEqual({
        isValid: true,
        transactionStatus: mockTransactionStatus.transaction_status,
        orderId: notification.order_id,
        grossAmount: notification.gross_amount,
      });
    });

    it('should throw error for invalid signature', async () => {
      const notification: MidtransNotification = {
        order_id: 'order-123',
        status_code: '200',
        gross_amount: '100000.00',
        signature_key: 'invalid-signature',
        transaction_status: 'settlement',
        transaction_time: '2023-01-01 10:00:00',
        transaction_id: 'trans-123',
        status_message: 'Success',
        payment_type: 'credit_card',
        merchant_id: 'merchant-123',
        currency: 'IDR',
      };

      jest.spyOn(service, 'verifyNotificationSignature').mockReturnValue(false);

      const result = await service.processNotification(notification);

      expect(service.verifyNotificationSignature).toHaveBeenCalledWith(notification);
      expect(result).toEqual({
        isValid: false,
        transactionStatus: notification.transaction_status,
        orderId: notification.order_id,
        grossAmount: notification.gross_amount,
      });
    });
  });

  describe('cancelTransaction', () => {
    it('should cancel transaction successfully', async () => {
      const orderId = 'order-123';
      const mockResponse = {
        status_code: '200',
        status_message: 'Success, transaction is canceled',
        transaction_id: 'trans-123',
        order_id: orderId,
        transaction_status: 'cancel',
      };

      mockCoreApi.transaction.cancel.mockResolvedValue(mockResponse);

      const result = await service.cancelTransaction(orderId);

      expect(mockCoreApi.transaction.cancel).toHaveBeenCalledWith(orderId);
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when cancellation fails', async () => {
      const orderId = 'order-123';
      const mockError = new Error('Cancel failed');
      mockCoreApi.transaction.cancel.mockRejectedValue(mockError);

      await expect(service.cancelTransaction(orderId)).rejects.toThrow('Failed to cancel transaction: Cancel failed');
    });
  });

  describe('refundTransaction', () => {
    it('should refund transaction successfully', async () => {
      const orderId = 'order-123';
      const amount = 50000;
      const reason = 'Customer request';
      const mockResponse = {
        status_code: '200',
        status_message: 'Success, refund is created',
        transaction_id: 'trans-123',
        order_id: orderId,
        refund_amount: amount.toString(),
      };

      mockCoreApi.transaction.refund.mockResolvedValue(mockResponse);

      const result = await service.refundTransaction(orderId, amount, reason);

      expect(mockCoreApi.transaction.refund).toHaveBeenCalledWith(orderId, {
        refund_key: expect.stringMatching(/^refund-order-123-\d+$/),
        amount,
        reason,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should refund transaction without amount and reason', async () => {
      const orderId = 'order-123';
      const mockResponse = {
        status_code: '200',
        status_message: 'Success, refund is created',
        transaction_id: 'trans-123',
        order_id: orderId,
      };

      mockCoreApi.transaction.refund.mockResolvedValue(mockResponse);

      const result = await service.refundTransaction(orderId);

      expect(mockCoreApi.transaction.refund).toHaveBeenCalledWith(orderId, {
        refund_key: expect.stringMatching(/^refund-order-123-\d+$/),
        amount: undefined,
        reason: 'Customer request',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when refund fails', async () => {
      const orderId = 'order-123';
      const mockError = new Error('Refund failed');
      mockCoreApi.transaction.refund.mockRejectedValue(mockError);

      await expect(service.refundTransaction(orderId)).rejects.toThrow('Failed to refund transaction: Refund failed');
    });
  });

  describe('getMidtransConfig', () => {
    it('should return midtrans configuration', () => {
      const result = service.getMidtransConfig();

      expect(result).toEqual({
        serverKey: mockConfig.serverKey,
        clientKey: mockConfig.clientKey,
        isProduction: mockConfig.isProduction,
      });
    });
  });

  describe('generateOrderId', () => {
    it('should generate order id with prefix', () => {
      const prefix = 'GYM';
      const result = service.generateOrderId(prefix);

      expect(result).toMatch(new RegExp(`^${prefix}-\\d{13}-[A-Z0-9]{6}$`));
    });

    it('should generate order id without prefix', () => {
      const result = service.generateOrderId();

      expect(result).toMatch(/^ORDER-\d{13}-[A-Z0-9]{6}$/);
    });
  });
});