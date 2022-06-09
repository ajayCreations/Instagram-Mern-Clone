const User = require('../models/User')
const jwt = require('jsonwebtoken');
const catchAsync = require('./catchAsync');

exports.isAuthenticated = catchAsync(async(req,res,next)=>{

    const {token} = req.cookies;
    if(!token){
        res.status(401).json({
            success:false,
            message:"please login first",
        })
    }

    const decoded = await jwt.verify(token,process.env.JWT_SECRET);
    req.user = await User.findById(decoded._id);
    next();
})