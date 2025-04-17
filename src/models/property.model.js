import mongoose, {Schema} from "mongoose";

const propertySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    address: { 
        type: String, 
        required: true 
    },
    pincode: {
        type: Number,
        required: true,
        validate: {
            validator: function(v) {
                return /\d{6}/.test(v); // Validate that pincode is a 6-digit number
            },
            message: props => `${props.value} is not a valid pincode!`
        }
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            required: true
        },
        coordinates: {
            type: [Number], // Must be an array of numbers [longitude, latitude]
            required: true
        }
    },

    listingType: { type: String, required: true },
    price: { 
        type: Number, 
        required: true 
    },
    sellerId: { 
        type: mongoose.Types.ObjectId, 
        ref: "User"
    }
});


propertySchema.index({ location: "2dsphere" });
propertySchema.index({ listingType: 1 });

export const Property = mongoose.model("Property", propertySchema);
