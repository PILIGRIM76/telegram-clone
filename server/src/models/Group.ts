import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  avatarUrl?: string;
  ownerId: Types.ObjectId;
  adminIds: Types.ObjectId[];
  memberIds: Types.ObjectId[];
  invitedLink?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<IGroup>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: null,
  },
  avatarUrl: {
    type: String,
    default: null,
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  adminIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  memberIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  invitedLink: {
    type: String,
    default: null,
    unique: true,
    sparse: true,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export const Group = mongoose.model<IGroup>('Group', groupSchema);