import mongoose, {Schema} from "mongoose";

const listingSchema = new Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  price: { type: Number, required: true },
  availability: { type: String, enum: ["available", "pending", "sold"], default: "available" },
  createdAt: { type: Date, default: Date.now }
});

listingSchema.index({ sellerId: 1 }); // Index for fast seller listings search
listingSchema.index({ listingType: 1 }); // For filtering by rent/sale


export const Listing = mongoose.model("Listing", listingSchema);
