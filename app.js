var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
const responseMiddleware = require('./middlewares/response');

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var usersRouter = require('./routes/users');
var songsRouter = require('./routes/songs');
var learningRouter = require('./routes/learning');
var wordbookRouter = require('./routes/wordbook');
var grammarbookRouter = require('./routes/grammarbook');
var ttsRouter = require('./routes/tts');
var redemptionRouter = require('./routes/redemption');
var neteaseLoginRouter = require('./routes/netease-login');
var adminRouter = require('./routes/admin');

var app = express();

app.use(responseMiddleware);
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/user', usersRouter);
app.use('/songs', songsRouter);
app.use('/learning', learningRouter);
app.use('/wordbook', wordbookRouter);
app.use('/grammarbook', grammarbookRouter);
app.use('/tts', ttsRouter);
app.use('/redemption', redemptionRouter);
app.use('/netease', neteaseLoginRouter);
app.use('/admin', adminRouter);

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
});

module.exports = app;
