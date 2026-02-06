var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors')
const responseMiddleware = require('./middlewares/response');;


var indexRouter = require('./routes/index');
var songsRouter = require('./routes/songs');
var learningRouter = require('./routes/learning');

var app = express();

app.use(responseMiddleware);
app.use(cors());    
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/songs', songsRouter);
app.use('/learning', learningRouter);

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
});

module.exports = app;
