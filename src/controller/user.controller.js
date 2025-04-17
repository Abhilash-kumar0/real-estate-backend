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
    
    const {name, email, phone, password, role} = req.body                      
    //console.log("email: ", email);

    if ([name, email, password, role].some((field) => typeof field !== "string" || field.trim() === "") || !phone) {
        throw new ApiError(400, "All fields are required");
    }
    
    if (!["buyer", "seller"].includes(role)) {
        throw new ApiError(400, "Role must be either 'buyer' or 'seller'");
    }
    

    const emailIsValid = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };
    
    // console.log("emailValid:", emailIsValid(email));
    
    if (!emailIsValid(email)) {
        throw new ApiError(400, "Email is Invalid!!");
    }

    const existedUser = await User.findOne({
        $or: [{ email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    
    const user = await User.create({
        name,
        email,
        phone, 
        password,
        role
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})


const loginUser = asyncHandler(async (req, res) => {
    const {email, password} = req.body

    if (!email || !password) {
        throw new ApiError(400, "Email and Password are required")
    }

    try {
        const user = await User.findOne({email})

        if(!user){
            throw new ApiError(404,"User does not exits")
        }

        const isPasswordCorrect = await user.isPasswordCorrect(password)

        if (!isPasswordCorrect) {
            throw new ApiError(401, "Invalid credentials")
        }

        const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

        const userLoggedIn = await User.findById(user._id).select("-password -refreshToken")

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200, 
                    userLoggedIn, 
                    "User logged in successfully"
                )
            )

    } catch (error) {
        throw new ApiError(500,"Internal server error!")
    }

})


const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

export{
    registerUser,
    loginUser,
    logoutUser
}