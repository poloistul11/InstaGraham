var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');


//Pentru validarea input-ului din Register Form
var expressValidator = require('express-validator');

//Authentication packages
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var MySQLStore = require('express-mysql-session')(session); //pentru memorarea sesiunii
var bcrypt = require('bcrypt')

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

require('dotenv').config();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressValidator());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//conexiunea la baza de date pentru retinerea sesiunii in db
var options = {
  host: "127.0.0.1",
  user: "root",
  password: "root",
  socketPath: "/Applications/MAMP/tmp/mysql/mysql.sock",
  port: 8887,
  database : "InstaGraham"
};
var sessionStore = new MySQLStore(options);

app.use(session({
  secret: 'secretul meu',
  resave: false,
  store: sessionStore,
  saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());

//functie care verifica daca un user estre logat in sesiune 
//pentru randare dinamica a header-ului
app.use(function(req, res, next){
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

app.use('/', index);
app.use('/users', users);
app.use(express.static("public"));

passport.use(new LocalStrategy(
  function (username, password, done) {
    console.log(username);
    console.log(password);

    const db = require('./db');
    db.query('SELECT id, passwordHash FROM users Where email =\'' + username + '\'', function (err, results, fields) {
      if (err) { done(err) };

      if (results.length == 0) {
        done(null, false);
      } else {
        var hash = results[0].passwordHash;
        bcrypt.compare(password, hash, function (err, response) {
          if (response == true) {
            return done(null, { user_id: results[0].user_ID });
          } else {
            return done(null, false);
          }
        });
      }
    })
  }
));

// catch 404 and forward to error handler
app.
  use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


// Handlebars default config
const hbs = require('hbs');
const fs = require('fs');

const partialsDir = __dirname + '/views/partials';

const filenames = fs.readdirSync(partialsDir);

filenames.forEach(function (filename) {
  const matches = /^([^.]+).hbs$/.exec(filename);
  if (!matches) {
    return;
  }
  const name = matches[1];
  const template = fs.readFileSync(partialsDir + '/' + filename, 'utf8');
  hbs.registerPartial(name, template);
});

hbs.registerHelper('json', function (context) {
  return JSON.stringify(context, null, 2);
});


module.exports = app;
