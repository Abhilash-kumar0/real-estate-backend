import mongoose, {Schema} from "mongoose";

const propertySchema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  listingType: { type: String, enum: ["rent", "sale"], required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

propertySchema.index({ location: "2dsphere" });
propertySchema.index({ listingType: 1 });

export const Property = mongoose.model("Property", propertySchema);
