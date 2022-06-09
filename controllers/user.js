const User = require("../models/User");
const catchAsync = require("../middleware/catchAsync");
const response = require("../utils/response");
const Post = require("../models/Post");
const sendEmail = require('../middleware/sendEmail');
const crypto = require('crypto');

exports.registerUser = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  let user = await User.findOne({ email });
  if (user) {
    response(res, 400, false, "User is already present!");
  }
  user = await User.create({
    name,
    email,
    password,
    avatar: { public_id: "test id", url: "test url" },
  });

  // login after register
  const token = await user.generateToken();
  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };
  res.status(201).cookie("token", token, options).json({
    success: true,
    user,
    token,
  });
  next();
});

// user login

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return response(res, 400, false, "User does not exist!");
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(400).json({
      success: false,
      message: "Incorrect password",
    });
  }

  const token = await user.generateToken();
  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  res.status(200).cookie("token", token, options).json({
    success: true,
    user,
    token,
  });
  next();
});

// logout

exports.logout = catchAsync(async (req, res, next) => {
  const options = { expires: new Date(Date.now()), httpOnly: true };

  res.status(200).cookie("token", null, options).json({
    success: true,
    message: "Logged Out",
  });
});

exports.followUser = catchAsync(async (req, res, next) => {
  const userToFollow = await User.findById(req.params.id);
  const loggedInUser = await User.findById(req.user._id);

  if (!userToFollow) return response(res, 404, false, "User not found");

  if (userToFollow.toString() == loggedInUser.toString())
    return response(res, 404, false, "can not follow same user");

  if (loggedInUser.following.includes(userToFollow._id)) {
    const indexFollowing = loggedInUser.following.indexOf(userToFollow._id);
    loggedInUser.following.splice(indexFollowing, 1);

    const indexFollowers = userToFollow.followers.indexOf(loggedInUser._id);
    userToFollow.followers.splice(indexFollowers, 1);

    await loggedInUser.save();
    await userToFollow.save();

    return response(res, 200, true, "User Unfollowed");
  } else {
    loggedInUser.following.push(userToFollow._id);
    userToFollow.followers.push(loggedInUser._id);

    await loggedInUser.save();
    await userToFollow.save();

    return response(res, 200, true, "User followed");
  }
});

// Update Passwords
exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("+password");
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword)
    return response(res, 400, false, "Please provide old and new password !");
  if (oldPassword === newPassword)
    return response(res, 400, false, "New password is same as old");

  const isMatch = await user.matchPassword(oldPassword);

  if (!isMatch) return response(res, 404, false, "Incorrect old password");

  user.password = newPassword;
  await user.save();
  return response(res, 200, true, "Password changed successfully !");
});

//update profile

exports.updateProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const { email, name } = req.body;

  if (!name && !email)
    return response(res, 400, false, "Please Enter some Value !");

  if (name) {
    user.name = name;
  }
  if (email) {
    user.email = email;
  }

  // user Avatar : TODO;

  await user.save();
  return response(res, 200, true, "Profile updated successfully ! ");
});

//Delete user

exports.deleteProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const posts = user.posts;
  const followers = user.followers;

  // removing followers of this user in others field
  for (let i = 0; i < followers.length; i++) {
    const user = await User.findById(followers[i]);
    const index = user.following.indexOf(req.user._id);
    user.following.splice(index, 1);
    user.followers.splice(index, 1);
    await user.save();
  }

  // after deleting user deleting all posts created by user !

  for (let i = 0; i < posts.length; i++) {
    const post = await Post.findById(posts[i]);
    await post.remove();
  }

  await user.remove();

  // logout user after deleting profile
  const options = { expires: new Date(Date.now()), httpOnly: true };
  res.cookie("token", null, options).json({
    success: true,
    message: "Logged Out",
  });

  return response(res, 200, true, "User deleted successfully !");
});

// Getting Profile Information
exports.myProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).populate("posts");
  return response(res, 200, true, user);
});


exports.getUserProfile=catchAsync(async(req,res,next)=>{
  const user = await User.findById(req.params.id).populate('posts');

  if(!user) return response(res,400,false,'User not found');

  return response(res,200,true,user)

})

exports.getAllUsers=catchAsync(async(req,res,next)=>{
  const users = await User.find({});

  return response(res,200,true,users)
})


// forgot password
exports.forgotPassword=catchAsync(async(req,res,next)=>{
  const user = await User.findOne({email:req.body.email});

  if(!user) return response(res,400,false,'User not found!');
  
  const resetPasswordToken = user.getResetPasswordToken();

  await user.save(); // saving after edinting date, and token; 

  const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/password/reset/${resetPasswordToken} `

  const message = `Reset Your Password by clicking on the link below: \n \n ${resetUrl}`;

  try {
    await sendEmail({
      email:user.email,
      subject:"Rest Password",
      message
    })

    return response(res,200,true,`Email sent to ${user.email}`)

  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire= undefined;
    await user.save();
    return response(res,500,false,`${error.message}`)
  }

})

// 
exports.resetPassword=catchAsync(async(req,res,next)=>{
   const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest('hex');

   const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire:{$gt:Date.now()},
   });

   if(!user) return response(res,401,false,'Token Invalid');

   user.password = req.body.password;
   user.resetPasswordToken = undefined;
   user.resetPasswordExpire  = undefined;
   await user.save();
   return response(res,200,true,'password changed! ')

})