import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IChat extends Document {
  type: 'direct' | 'group';
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>({
  type: {
    type: String,
    enum: ['direct', 'group'],
    required: true,
    default: 'direct',
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  lastMessageAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Индекс для поиска чатов пользователя
chatSchema.index({ participants: 1 });

export const Chat = mongoose.model<IChat>('Chat', chatSchema);