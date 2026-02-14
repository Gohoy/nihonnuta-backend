function responseMiddleware(req, res, next) {
  res.success = function (data) {
    res.json({
      statusCode: 200,
      data,
      code: 0,
    });
  };

  res.fail = function (statusCode, message) {
    res.status(statusCode).json({
      statusCode,
      message,
    });
  };

  next();
}

module.exports = responseMiddleware;
