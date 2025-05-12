import {Listing} from "../models/listing.model.js";
// import redisClient from "../config/redis.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";

// 🏡 Create a new listing
export const createListing = async (req, res, next) => {
    try {
        const { propertyId, sellerId, price, availability } = req.body;

        if (!propertyId || !sellerId || !price) {
            throw new ApiError(400, "Missing required fields.");
        }

        const listing = await Listing.create({ propertyId, sellerId, price, availability });

        // 🔄 Clear cache after adding a new listing
        await redisClient.del("allListings");
        await redisClient.del(`sellerListings:${sellerId}`);

        return res.status(201).json(new ApiResponse(201, listing, "Listing created successfully."));
    } catch (error) {
        next(error);
    }
};

// 📜 Get all listings (with Redis caching)
export const getAllListings = async (req, res, next) => {
    try {
        const cacheKey = "allListings";
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log("✅ Cache Hit");
            return res.json(new ApiResponse(200, JSON.parse(cachedData), "All listings fetched from cache."));
        }

        console.log("⏳ Fetching from Database...");
        const listings = await Listing.find().populate("propertyId");

        // ✅ Store in Redis Cache (Expires in 10 minutes)
        await redisClient.setEx(cacheKey, 600, JSON.stringify(listings));

        return res.json(new ApiResponse(200, listings, "All listings fetched successfully."));
    } catch (error) {
        next(error);
    }
};

// 📜 Get all listings for a specific seller (with Redis caching)
export const getListingsBySeller = async (req, res, next) => {
    try {
        const { sellerId } = req.params;

        const cacheKey = `sellerListings:${sellerId}`;
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log("✅ Cache Hit");
            return res.json(new ApiResponse(200, JSON.parse(cachedData), "Seller listings fetched from cache."));
        }

        console.log("⏳ Fetching from Database...");
        const listings = await Listing.find({ sellerId }).populate("propertyId");

        // ✅ Store in Redis Cache (Expires in 10 minutes)
        await redisClient.setEx(cacheKey, 600, JSON.stringify(listings));

        return res.json(new ApiResponse(200, listings, "Seller listings fetched successfully."));
    } catch (error) {
        next(error);
    }
};

// 🔍 Get a specific listing by ID (with Redis caching)
export const getListingById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const cacheKey = `listing:${id}`;
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log("✅ Cache Hit");
            return res.json(new ApiResponse(200, JSON.parse(cachedData), "Listing fetched from cache."));
        }

        const listing = await Listing.findById(id).populate("propertyId");
        if (!listing) throw new ApiError(404, "Listing not found.");

        // ✅ Cache the listing data (Expires in 10 minutes)
        await redisClient.setEx(cacheKey, 600, JSON.stringify(listing));

        return res.json(new ApiResponse(200, listing, "Listing fetched successfully."));
    } catch (error) {
        next(error);
    }
};

// ✏️ Update listing & clear cache
export const updateListing = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updatedListing = await Listing.findByIdAndUpdate(id, req.body, { new: true });

        if (!updatedListing) throw new ApiError(404, "Listing not found.");

        // 🔄 Clear cache after update
        await redisClient.del(`listing:${id}`);
        await redisClient.del("allListings");
        await redisClient.del(`sellerListings:${updatedListing.sellerId}`);

        return res.json(new ApiResponse(200, updatedListing, "Listing updated successfully."));
    } catch (error) {
        next(error);
    }
};

// ❌ Delete a listing & clear cache
export const deleteListing = async (req, res, next) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findByIdAndDelete(id);
        
        if (!listing) throw new ApiError(404, "Listing not found.");

        // 🔄 Clear cache after delete
        await redisClient.del(`listing:${id}`);
        await redisClient.del(`sellerListings:${listing.sellerId}`);
        await redisClient.del("allListings");

        return res.json(new ApiResponse(200, null, "Listing deleted successfully."));
    } catch (error) {
        next(error);
    }
};
