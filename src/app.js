import express, { urlencoded } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';


const app = express();

app.use(cors(
    {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
))

app.use(express.json({limit: "16kb"}));
app.use(urlencoded({extended: true, limit: "16kb"}));
app.use(express.static('public'));
app.use(cookieParser());


//import routes
import userRoutes from './routes/user.routes.js';
import propertyRoutes from './routes/property.routes.js';
import listingRoutes from './routes/listing.routes.js';



//routes declaration
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/property", propertyRoutes);
app.use("/api/v1/listing", listingRoutes);


export {app}