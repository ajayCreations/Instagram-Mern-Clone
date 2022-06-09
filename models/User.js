const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Enter name"],
  },
  avatar: {
    public_id: String,
    url: String,
  },
  email: {
    type: String,
    required: [true, "please enter an email"],
    unique: [true, "Email already exists"],
    lowercase: true,
    uppercase: true,
  },

  password: {
    type: String,
    required: [true, "please enter password"],
    minlength: [6, "password must be at least 6 characters"],
    select: false,
  },

  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
  ],
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

//hasing password before save
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  next();
});

//for matching password
userSchema.methods.matchPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

//for generate token
userSchema.methods.generateToken = function () {
  return jwt.sign({ _id: this._id }, process.env.JWT_SECRET);
};

// Reset Password
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  console.log(resetToken);
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex"); // can also use .toString() insteat of .diget();
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // valid for 10 minutes;

  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
