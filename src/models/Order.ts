import mongoose, { Document, Schema } from 'mongoose';

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAYMENT_VERIFIED = 'payment_verified',
  PASSPORT_REQUESTED = 'passport_requested',
  PASSPORT_VERIFIED = 'passport_verified',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  products: Array<{
    product: mongoose.Types.ObjectId;
    quantity: number;
    price: number;
  }>;
  deliveryAddress: string;
  contactPhone: string;
  additionalPhone?: string;
  telegramUsername?: string;
  paymentScreenshot?: string;
  prepaymentAmount: number;
  prepaymentPercentage: number;
  status: OrderStatus;
  passportData?: string; // Encrypted/masked for demo
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    deliveryAddress: {
      type: String,
      required: true,
    },
    contactPhone: {
      type: String,
      required: true,
    },
    additionalPhone: {
      type: String,
    },
    telegramUsername: {
      type: String,
    },
    paymentScreenshot: {
      type: String,
    },
    prepaymentAmount: {
      type: Number,
      required: true,
    },
    prepaymentPercentage: {
      type: Number,
      required: true,
      default: 50, // 50% by default
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING_PAYMENT,
    },
    passportData: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IOrder>('Order', OrderSchema);
