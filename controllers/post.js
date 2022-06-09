const Post = require("../models/Post");
const catchAsync = require("../middleware/catchAsync");
const User = require("../models/User");
const response = require("../utils/response");

// for creating a new post

exports.createPost = catchAsync(async (req, res, next) => {
  const { caption } = req.body;

  const newPostData = {
    caption: caption,
    image: {
      public_id: "test",
      url: "url",
    },
    owner: req.user._id,
  };

  const post = await Post.create(newPostData);
  const user = await User.findById(req.user._id);

  user.posts.push(post._id);
  await user.save();

  response(res, 201, true, post);
});

// like like and dislike the current post

exports.likeAndUnlikePost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) return response(res, 404, false, "Post not found !"); // if post don't found!

  if (post.likes.includes(req.user._id)) {
    const index = post.likes.indexOf(req.user._id);
    post.likes.splice(index, 1);

    await post.save();

    return response(res, 200, true, "Post Unliked");
  } else {
    post.likes.push(req.user._id);
    await post.save();

    return response(res, 201, true, "Post liked");
  }
});

exports.deletePost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) return response(res, 404, false, "Post not found");

  if (post.owner.toString() !== req.user._id.toString()) {
    return response(res, 404, false, "Unauthorized");
  }

  await post.remove();
  const user = await User.findById(req.user._id);
  const index = user.posts.indexOf(req.params.id);
  user.posts.splice(index, 1);
  await user.save();

  response(res, 200, true, "Post Deleted");
});

// getting post of following

exports.getPostOfFollowing = catchAsync(async (req, res, next) => {
  // const  user = await User.findById(req.user._id).populate('following','posts');
  const user = await User.findById(req.user._id);
  const posts = await Post.find({
    owner: {
      $in: user.following,
    },
  });

  return response(res, 200, true, posts);
});

// updating caption
exports.updatePost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) return response(res, 400, false, "Post not found");

  if (post.owner.toString() !== req.user._id.toString())
    return response(res, 400, false, "Access Denied !");

  post.caption = req.body.caption;
  await post.save();
  return response(res, 200, true, "Caption updated!");
});

// Add / update comment
exports.commentOnPost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) return response(res, 400, true, "Post not found");

  let commentIndex = -1;
  // checking if comment present !
  post.comments.forEach((item, index) => {
    if (item.user.toString() === req.user._id.toString()) commentIndex = index;
  });

  if (commentIndex !== -1) {
    post.comments[commentIndex].comment = req.body.comment;
    await post.save();
    return response(res, 200, true, "Comment Updated!");
  } else {
    post.comments.push({
      user: req.user._id,
      comment: req.body.comment,
    });
    await post.save();
    return response(res, 200, true, "Comment added!");
  }
});

// delete comments
exports.deleteComment = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);


  if (!post) return response(res, 404, false, "Post not found");

  let commentFound = false;

  //user can delete any comments on his post !
  if (post.owner.toString() === req.user._id.toString()) { 

    if(req.body.commentId == undefined) return response (res,400,false,'Comment Id is required')

    post.comments.forEach(async(item, index) => {
      if (item._id.toString() === req.body.commentId.toString()) {
        commentFound = true;
        return post.comments.splice(index, 1);    
      }
    });

  } else {
    post.comments.forEach(async(item, index) => {
      if (item.user.toString() === req.user._id.toString()) {
        commentFound = true;
        return post.comments.splice(index, 1); 
      }
    });
  }
  await post.save();
  if(commentFound){
    return response(res, 200, true, "Comment deleted successfully !");
  }else{
    return response(res,404,false,'Comment Not Found!');
  }
});
