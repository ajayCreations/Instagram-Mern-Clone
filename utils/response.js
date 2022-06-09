module.exports= (res, status, success, message) => {
  return res.status(status).json({
    success,
    message,
  });
};
