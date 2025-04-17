import { Property } from "../models/property.model.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import redisClient from "../config/redis.js";
import mongoose from "mongoose";

// 📌 Create a New Property
const createProperty = async (req, res, next) => {
    try {
        const { name, address, pincode,  location, listingType, price} = req.body;

        // ✅ Validate Required Fields
        if (![name, address, pincode, city, state, location, listingType, price].every(Boolean)) {
            throw new ApiError(400, "All fields (name, address, location, pincode, city, state, listingType, price, sellerId) are required.");
        }

        // ✅ Validate Listing Type
        if (!["rent", "sale"].includes(listingType)) {
            throw new ApiError(400, "listingType must be either 'rent' or 'sale'.");
        }

        // ✅ Validate Price
        if (typeof price !== "number" || price <= 0) {
            throw new ApiError(400, "Price must be a positive number.");
        }

        // ✅ Validate Location Format (Latitude & Longitude)
        if (!location || typeof location !== "object" || !location.lat || !location.lng) {
            throw new ApiError(400, "Location must be an object with 'lat' and 'lng' values.");
        }
        // ✅ Convert Location to GeoJSON Format for MongoDB
        const geoLocation = {
            type: "Point",
            coordinates: [location.lat,location.lng] // [longitude, latitude]
        };

        // ✅ Create & Save Property
        const newProperty = new Property({
            name,
            address,
            pincode,
            city,
            state,
            location: geoLocation,
            listingType,
            price,
            sellerId: req.user?._id,
        });

        await newProperty.save();

        // 🔄 Clear Cache after Adding a New Property
        await redisClient.flushDb();

        return res.status(201).json(new ApiResponse(201, newProperty, "Property created successfully"));
    } catch (error) {
        next(error); // Pass error to global error handler
    }
};

// 📌 Get Nearby Properties with Redis Caching
const getNearbyProperties = async (req, res, next) => {
    try {
        const { lat, lon, radius = 5000 } = req.query;
        if (!lat || !lon) {
            throw new ApiError(400, "Latitude & Longitude are required.");
        }

        const cacheKey = `nearby:${lat}:${lon}:${radius}`;
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log("✅ Cache Hit");
            return res.json(new ApiResponse(200, JSON.parse(cachedData), "Nearby properties fetched from cache."));
        }

        console.log("⏳ Fetching from Database...");
        const properties = await Property.find({
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [parseFloat(lat), parseFloat(lon)] },
                    $maxDistance: parseFloat(radius),
                },
            },
        });

        // ✅ Store Data in Redis Cache (Expire in 10 minutes)
        await redisClient.setEx(cacheKey, 600, JSON.stringify(properties));

        return res.json(new ApiResponse(200, properties, "Nearby properties fetched successfully."));
    } catch (error) {
        next(error);
    }
};

// 📌 Get Property by ID with Redis Caching
const getPropertyById = async (req, res, next) => {
    try {
        const { id } = req.params;


        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            throw new ApiError(404,"invalid propert id")
        }

        const cacheKey = `property:${id}`;
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log("✅ Cache Hit");
            return res.json(new ApiResponse(200, JSON.parse(cachedData), "Property fetched from cache."));
        }

        const property = await Property.findById(id);
        if (!property) throw new ApiError(404, "Property not found.");

        // ✅ Cache the property data (Expire in 30 minutes)
        await redisClient.setEx(cacheKey, 1800, JSON.stringify(property));

        return res.json(new ApiResponse(200, property, "Property fetched successfully."));
    } catch (error) {
        next(error);
    }
};

// 📌 Update Property & Clear Cache
const updateProperty = async (req, res, next) => {
    try {
        const { id } = req.params;

        const updatedProperty = await Property.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedProperty) throw new ApiError(404, "Property not found.");

        // 🔄 Clear Cache after Update
        await Promise.all([
            redisClient.del(`property:${id}`),
            redisClient.flushDb(),
        ]);

        return res.json(new ApiResponse(200, updatedProperty, "Property updated successfully."));
    } catch (error) {
        next(error);
    }
};

// 📌 Delete Property & Clear Cache
const deleteProperty = async (req, res, next) => {
    try {
        const { id } = req.params;

        const deletedProperty = await Property.findByIdAndDelete(id);
        if (!deletedProperty) throw new ApiError(404, "Property not found.");

        // 🔄 Clear Cache after Delete
        await Promise.all([
            redisClient.del(`property:${id}`),
            redisClient.flushDb(),
        ]);

        return res.json(new ApiResponse(200, null, "Property deleted successfully."));
    } catch (error) {
        next(error);
    }
};


export { 
    createProperty, 
    getNearbyProperties ,
    getPropertyById,
    updateProperty,
    deleteProperty
};