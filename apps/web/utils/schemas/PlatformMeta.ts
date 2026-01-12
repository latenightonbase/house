import mongoose, { Schema, Document } from 'mongoose';

// Interface for the Whitelist document
export interface IPlatformMeta extends Document {
  minTokenRequired: Number;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema for Whitelist
const PlatformMetaSchema: Schema = new Schema(
  {
    minTokenRequired: {
      type: Number,
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

// Create and export the model
const PlatformMeta = mongoose.models.PlatformMeta || mongoose.model<IPlatformMeta>('PlatformMeta', PlatformMetaSchema);

export default PlatformMeta;