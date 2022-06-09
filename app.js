
const express = require('express')
const app=express();
const cookieParser = require('cookie-parser');

if(process.env.NODE_ENV !== "production"){
    require("dotenv").config({path:"server/config/config.env"});
}

const {connnectDatabase} = require('./config/database');

connnectDatabase();

// using middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended:true})); // bodyParser can be use



//importing routes 
const post = require('./routes/postRoute');
const user = require('./routes/userRoute')
const errorMiddleware = require('./middleware/error');

app.use("/api/v1",post);
app.use("/api/v1",user);

app.use(errorMiddleware)


module.exports= app