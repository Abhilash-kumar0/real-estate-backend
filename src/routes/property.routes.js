import express from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
    createProperty,
    getNearbyProperties,
    getPropertyById,
    updateProperty,
    deleteProperty,
} from "../controller/property.controller.js";

const router = express.Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file


router.route("/").get(createProperty);
router.route("/nearby").get(getNearbyProperties);
router.route("/:id").get(getPropertyById).put(updateProperty).delete(deleteProperty);


export default router;