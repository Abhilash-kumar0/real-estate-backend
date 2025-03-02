import express from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
    createListing,
    getAllListings,
    getListingById,
    getListingsBySeller,
    updateListing,
    deleteListing,
} from "../controller/listing.controller.js";


const router = express.Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.post("/", createListing);
router.get("/", getAllListings);
router.get("/:id", getListingById);
router.get("/seller/:sellerId", getListingsBySeller);
router.put("/:id", updateListing);
router.delete("/:id", deleteListing);

export default router;
