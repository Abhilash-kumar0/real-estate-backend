import { Property } from "../models/property.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
// import redisClient from "../config/redis.js";
import mongoose from "mongoose";

// 📌 Create a New Property
const createProperty = async (req, res, next) => {
    try {
        const properties = Array.isArray(req.body) ? req.body : [req.body];

        const preparedProperties = properties.map((prop) => {
            const {
                name,
                address,
                pincode,
                city,
                state,
                location,
                listingType,
                price,
            } = prop;

            if (
                !name ||
                !address ||
                !pincode ||
                !city ||
                !state ||
                !location ||
                !listingType ||
                !price
            ) {
                throw new ApiError(400, "All fields are required for each property.");
            }

            if (!["rent", "sale"].includes(listingType)) {
                throw new ApiError(400, "listingType must be either 'rent' or 'sale'.");
            }

            if (typeof price !== "number" || price <= 0) {
                throw new ApiError(400, "Price must be a positive number.");
            }

            if (
                !location ||
                typeof location !== "object" ||
                !location.lat ||
                !location.lng
            ) {
                throw new ApiError(400, "Location must have 'lat' and 'lng'.");
            }

            return {
                name,
                address,
                pincode,
                city,
                state,
                listingType,
                price,
                sellerId: req.user?._id,
                location: {
                    type: "Point",
                    coordinates: [location.lat, location.lng],
                },
            };
        });

        const savedProperties = await Property.insertMany(preparedProperties);

        //await redisClient.flushDb(); // Clear cache

        return res
            .status(201)
            .json(
                new ApiResponse(201, savedProperties, "Properties created successfully")
            );
    } catch (error) {
        next(error);
    }
};

// 📌 Get Nearby Properties with Redis Caching
const getNearbyProperties = async (req, res, next) => {
    try {
        const { lat, lon, radius = 5000 } = req.query;
        if (!lat || !lon) {
            throw new ApiError(400, "Latitude & Longitude are required.");
        }

        // const cacheKey = `nearby:${lat}:${lon}:${radius}`;
        // const cachedData = await redisClient.get(cacheKey);

        // if (cachedData) {
        //     console.log("✅ Cache Hit");
        //     return res.json(
        //         new ApiResponse(
        //             200,
        //             JSON.parse(cachedData),
        //             "Nearby properties fetched from cache."
        //         )
        //     );
        // }

        console.log("⏳ Fetching from Database...");
        const result = await Property.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [parseFloat(lat), parseFloat(lon)],
                    },
                    distanceField: "dist.calculated",
                    maxDistance: parseFloat(radius),
                    spherical: true,
                },
            },
            {
                $facet: {
                    properties: [
                        { $limit: 50 }, // optional: limit number of returned docs
                    ],
                    count: [{ $count: "total" }],
                },
            },
        ]);

        // ✅ Store Data in Redis Cache (Expire in 10 minutes)
        //await redisClient.setEx(cacheKey, 600, JSON.stringify(result));

        return res.json(
            new ApiResponse(200, result, "Nearby properties fetched successfully.")
        );
    } catch (error) {
        next(error);
    }
};

// 📌 Get Property by ID with Redis Caching
const getPropertyById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            throw new ApiError(404, "invalid propert id");
        }

        // const cacheKey = `property:${id}`;
        // const cachedData = await redisClient.get(cacheKey);

        // if (cachedData) {
        //     console.log("✅ Cache Hit");
        //     return res.json(
        //         new ApiResponse(
        //             200,
        //             JSON.parse(cachedData),
        //             "Property fetched from cache."
        //         )
        //     );
        // }

        const property = await Property.findById(id);
        if (!property) throw new ApiError(404, "Property not found.");

        // ✅ Cache the property data (Expire in 30 minutes)
        // await redisClient.setEx(cacheKey, 1800, JSON.stringify(property));

        return res.json(
            new ApiResponse(200, property, "Property fetched successfully.")
        );
    } catch (error) {
        next(error);
    }
};

// 📌 Update Property & Clear Cache
const updateProperty = async (req, res, next) => {
    try {
        const { id } = req.params;

        const updatedProperty = await Property.findByIdAndUpdate(id, req.body, {
            new: true,
        });
        if (!updatedProperty) throw new ApiError(404, "Property not found.");

        // 🔄 Clear Cache after Update
        await Promise.all([
            redisClient.del(`property:${id}`),
            redisClient.flushDb(),
        ]);

        return res.json(
            new ApiResponse(200, updatedProperty, "Property updated successfully.")
        );
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
        // await Promise.all([
        //     redisClient.del(`property:${id}`),
        //     redisClient.flushDb(),
        // ]);

        return res.json(
            new ApiResponse(200, null, "Property deleted successfully.")
        );
    } catch (error) {
        next(error);
    }
};

export {
    createProperty,
    getNearbyProperties,
    getPropertyById,
    updateProperty,
    deleteProperty,
};
