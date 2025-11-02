import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as midtransClient from 'midtrans-client';
import {
  MidtransConfig,
  MidtransTransactionRequest,
  MidtransTransactionResponse,
  MidtransNotification,
  MidtransTransactionStatus,
} from './midtrans.interface';
import * as crypto from 'crypto';

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);
  private snap: any;
  private coreApi: any;
  private config: MidtransConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      serverKey: this.configService.get<string>('MIDTRANS_SERVER_KEY'),
      clientKey: this.configService.get<string>('MIDTRANS_CLIENT_KEY'),
      isProduction: this.configService.get<string>('NODE_ENV') === 'production',
    };

    // Initialize Midtrans Snap
    this.snap = new midtransClient.Snap({
      isProduction: this.config.isProduction,
      serverKey: this.config.serverKey,
      clientKey: this.config.clientKey,
    });

    // Initialize Midtrans Core API
    this.coreApi = new midtransClient.CoreApi({
      isProduction: this.config.isProduction,
      serverKey: this.config.serverKey,
      clientKey: this.config.clientKey,
    });

    this.logger.log(
      `Midtrans initialized in ${this.config.isProduction ? 'production' : 'sandbox'} mode`,
    );
  }

  /**
   * Create Snap transaction token
   */
  async createSnapTransaction(
    transactionRequest: MidtransTransactionRequest,
  ): Promise<MidtransTransactionResponse> {
    try {
      this.logger.log(`Creating Snap transaction for order: ${transactionRequest.transaction_details.order_id}`);
      
      const transaction = await this.snap.createTransaction(transactionRequest);
      
      this.logger.log(`Snap transaction created successfully: ${transaction.token}`);
      
      return {
        status_code: '201',
        status_message: 'Success, snap token is created',
        transaction_id: transaction.token,
        order_id: transactionRequest.transaction_details.order_id,
        merchant_id: '',
        gross_amount: transactionRequest.transaction_details.gross_amount.toString(),
        currency: 'IDR',
        payment_type: 'snap',
        transaction_time: new Date().toISOString(),
        transaction_status: 'pending',
        token: transaction.token,
        redirect_url: transaction.redirect_url,
      };
    } catch (error) {
      this.logger.error('Failed to create Snap transaction:', error);
      throw new Error(`Failed to create Snap transaction: ${error.message}`);
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(orderId: string): Promise<MidtransTransactionStatus> {
    try {
      this.logger.log(`Getting transaction status for order: ${orderId}`);
      
      const status = await this.coreApi.transaction.status(orderId);
      
      this.logger.log(`Transaction status retrieved: ${status.transaction_status}`);
      
      return status;
    } catch (error) {
      this.logger.error('Failed to get transaction status:', error);
      throw new Error(`Failed to get transaction status: ${error.message}`);
    }
  }

  /**
   * Verify notification signature
   */
  verifyNotificationSignature(notification: MidtransNotification): boolean {
    try {
      const { order_id, status_code, gross_amount, signature_key } = notification;
      
      const serverKey = this.config.serverKey;
      const input = `${order_id}${status_code}${gross_amount}${serverKey}`;
      const hash = crypto.createHash('sha512').update(input).digest('hex');
      
      const isValid = hash === signature_key;
      
      this.logger.log(`Notification signature verification: ${isValid ? 'valid' : 'invalid'}`);
      
      return isValid;
    } catch (error) {
      this.logger.error('Failed to verify notification signature:', error);
      return false;
    }
  }

  /**
   * Process notification from Midtrans
   */
  async processNotification(notification: MidtransNotification): Promise<{
    isValid: boolean;
    transactionStatus: string;
    orderId: string;
    grossAmount: string;
  }> {
    try {
      this.logger.log(`Processing notification for order: ${notification.order_id}`);
      
      // Verify signature
      const isValid = this.verifyNotificationSignature(notification);
      
      if (!isValid) {
        this.logger.warn(`Invalid notification signature for order: ${notification.order_id}`);
        return {
          isValid: false,
          transactionStatus: notification.transaction_status,
          orderId: notification.order_id,
          grossAmount: notification.gross_amount,
        };
      }
      
      // Get latest transaction status
      const latestStatus = await this.getTransactionStatus(notification.order_id);
      
      return {
        isValid: true,
        transactionStatus: latestStatus.transaction_status,
        orderId: notification.order_id,
        grossAmount: notification.gross_amount,
      };
    } catch (error) {
      this.logger.error('Failed to process notification:', error);
      throw new Error(`Failed to process notification: ${error.message}`);
    }
  }

  /**
   * Cancel transaction
   */
  async cancelTransaction(orderId: string): Promise<any> {
    try {
      this.logger.log(`Cancelling transaction for order: ${orderId}`);
      
      const result = await this.coreApi.transaction.cancel(orderId);
      
      this.logger.log(`Transaction cancelled successfully: ${orderId}`);
      
      return result;
    } catch (error) {
      this.logger.error('Failed to cancel transaction:', error);
      throw new Error(`Failed to cancel transaction: ${error.message}`);
    }
  }

  /**
   * Refund transaction
   */
  async refundTransaction(orderId: string, amount?: number, reason?: string): Promise<any> {
    try {
      this.logger.log(`Refunding transaction for order: ${orderId}`);
      
      const refundRequest: any = {
        refund_key: `refund-${orderId}-${Date.now()}`,
        amount: amount,
        reason: reason || 'Customer request',
      };
      
      const result = await this.coreApi.transaction.refund(orderId, refundRequest);
      
      this.logger.log(`Transaction refunded successfully: ${orderId}`);
      
      return result;
    } catch (error) {
      this.logger.error('Failed to refund transaction:', error);
      throw new Error(`Failed to refund transaction: ${error.message}`);
    }
  }

  /**
   * Get Midtrans configuration
   */
  getConfig(): MidtransConfig {
    return {
      ...this.config,
      serverKey: '***', // Hide server key for security
    };
  }

  /**
   * Get Midtrans configuration
   */
  getMidtransConfig(): MidtransConfig {
    return {
      serverKey: this.configService.get<string>('MIDTRANS_SERVER_KEY'),
      clientKey: this.configService.get<string>('MIDTRANS_CLIENT_KEY'),
      isProduction: this.configService.get<boolean>('MIDTRANS_IS_PRODUCTION', false),
    };
  }

  /**
   * Generate unique order ID
   */
  generateOrderId(prefix: string = 'ORDER'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
}