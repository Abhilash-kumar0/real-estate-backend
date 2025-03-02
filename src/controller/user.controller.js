import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";


const generateAccessAndRefreshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // console.log("refreshToken Generated:", refreshToken)

        user.refreshToken = refreshToken 
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { name, email, phone, password, role } = req.body;

    // Validate required fields
    if (![name, email, password, role].every(field => typeof field === "string" && field.trim() !== "") || !phone) {
        throw new ApiError(400, "All fields are required");
    }

    // Validate role
    if (!["buyer", "seller"].includes(role)) {
        throw new ApiError(400, "Role must be either 'buyer' or 'seller'");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new ApiError(400, "Invalid email format");
    }

    // Validate phone number (basic check)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
        throw new ApiError(400, "Phone number must be 10 digits");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new ApiError(409, "User with this email already exists");
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
        name,
        email,
        phone,
        password: hashedPassword,  // Store hashed password
        role
    });

    // Remove sensitive data before returning
    const createdUser = await User.findById(newUser._id).select("-password");

    if (!createdUser) {
        throw new ApiError(500, "Error while registering user");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
});



const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // ✅ Validate Required Fields
    if (!email || !password) {
        throw new ApiError(400, "Email and Password are required.");
    }

    // ✅ Validate Email Format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new ApiError(400, "Invalid email format.");
    }

    // ✅ Check if User Exists
    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User does not exist.");
    }

    // ✅ Compare Password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid credentials.");
    }

    // ✅ Generate Tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // ✅ Remove Sensitive Fields Before Sending Response
    const userLoggedIn = await User.findById(user._id).select("-password -refreshToken");

    // ✅ Set Secure Cookie Options
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",  // Set secure flag in production
        sameSite: "strict"
    };

    // ✅ Send Response with Cookies
    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { user: userLoggedIn, accessToken }, "User logged in successfully"));
});


export{
    registerUser,
    loginUser
}