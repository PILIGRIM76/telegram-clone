import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAdmin extends Document {
  email: string;
  password: string;
  name: string;
  role: 'superadmin' | 'admin' | 'moderator';
  isActive: boolean;
  createdAt: Date;
}

const adminSchema = new Schema<IAdmin>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'moderator'],
    default: 'admin',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export const Admin = mongoose.model<IAdmin>('Admin', adminSchema);