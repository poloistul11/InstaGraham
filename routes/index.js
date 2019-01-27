var express = require('express');
var router = express.Router();

var passport = require('passport');

//Pentru criptarea parolei
var bcrypt = require('bcrypt');
const saltRounds = 10;



/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('home', { title: 'Home' });
});



/* Authentication routes */
router.get('/login', function (req, res, next) {
  res.render('login', { title: 'Login' });
});


router.post('/login', passport.authenticate('local'),
  function (req, res) {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.
    res.redirect('/');
  });


router.get('/register', function (req, res, next) {
  res.render('register', { title: 'Registration' });
});


router.post('/register', function (req, res, next) {
  req.checkBody('username', 'Username field cannot be empty.').notEmpty();
  req.checkBody('username', 'Username field must not contain spaces').custom(value => !/\s/.test(value));
  req.checkBody('email', 'Email field cannot be empty.').notEmpty();
  req.checkBody('email', 'Email is invalid, please try again.').isEmail();
  req.checkBody('password', 'Password field cannot be empty.').notEmpty();
  req.checkBody('password', 'Password must be between 5-20 characters long').len(5, 20);
  req.checkBody('passwordMatch', 'Password-Match field cannot be empty.').notEmpty();
  req.checkBody('passwordMatch', 'Passwords do not match, please try again').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    //console.log(JSON.stringify(errors));
    res.render('register', {
      title: 'Registration Error',
      errors: errors
    });
  } else {
    const email = req.body.email;
    const password = req.body.password;
    const username = req.body.username;
    const db = require('../db.js');


    var hash = bcrypt.hashSync(password, saltRounds);
    db.query('INSERT INTO users(email, passwordHash, username) VALUES (?, ?, ?)', [email, hash, username], function (error, results, fields) {
      if (error) throw (error);

      db.query('SELECT LAST_INSERT_ID() as user_id', function (error, results, fields) {
        if (error) throw (error);

        const user_id = results[0];
        console.log(user_id);
        req.login(user_id, function (err) {
          res.redirect('/');
        })
      })
    })
  }
});


router.get('/logout', function (req, res, next) {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});


passport.serializeUser(function (user_id, done) {
  done(null, user_id);
})


passport.deserializeUser(function (user_id, done) {
  done(null, user_id);
})

//middleware pentru  verificare daca exista o sesiune activa pt user
function authenticationMiddleware() {
  return (req, res, next) => {
    console.log(`req.session.passport.user: ${JSON.stringify(req.session.passport)}`);

    if (req.isAuthenticated()) return next();
    res.redirect('/login')
  }
}



/* Wall routes */
router.get('/wall', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');
  var query1 = "SELECT p.id, p.owner, p.link, p.description, u.username AS name, \
                (SELECT COUNT(*) FROM likes l WHERE l.photoTarget = p.id ) AS likes \
              FROM photos p \
              INNER JOIN users u ON p.owner= u.id\
              ORDER BY likes DESC, id ASC";

  db.query(query1, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      var photos = JSON.parse(JSON.stringify(result));

      var query2 = "SELECT c.id, c.text, c.photoTarget, c.userOrigin, u.username AS name\
                    FROM comments c \
                    INNER JOIN users u ON c.userOrigin = u.id";

      db.query(query2, function (err, result, fields) {
        if (err) res.status(107).send(err);
        else {
          var comments = JSON.parse(JSON.stringify(result));

          for (var i = 0; i < photos.length; i++) {
            photos[i].comments = [];
          }

          var commentAux = {
            id: 0,
            text: "text",
            photoTarget: 0,
            userOrigin: 0,
            name: "name"
          }

          for (var i = 0; i < photos.length; i++) {
            for (var j = 0; j < comments.length; j++) {
              if (photos[i].id == comments[j].photoTarget) {
                commentAux = comments[j];
              
                photos[i].comments.push(commentAux);
              }
            }
          }
        }
        res.render('wall', { title: "Baker's Wall", photos});
      });
    }
  });
});


router.get('/add_picture', authenticationMiddleware(), function (req, res, next) {
  res.status(200).render('./add_picture');
});


router.post('/add_picture', authenticationMiddleware(), function (req, res, next) {

  req.checkBody('link', 'Link field must be a URL').isURL();
  req.checkBody('link', 'Link field can not be empty').notEmpty();
  req.checkBody('description', 'Description field can not be empty').notEmpty();

  const errors = req.validationErrors();
  //teams = req.body;
  if (errors) {
    res.render('add_picture', {
      errors: errors
    });
  } else {
    var owner = req.session.passport.user.user_id;
    var link = req.body.link;
    var description = req.body.description;

    const db = require('../db.js');

    db.query("INSERT INTO photos(owner, link, description) VALUES (?, ?, ?)", [owner, link, description], function (err, result, fields) {
      if (err) res.status(107).send(err);
      else {
        res.status(200).render('./success');
      }
    });
  }
});


router.post('/add_comment/:id', authenticationMiddleware(), function (req, res, next) {
  var photoTarget = req.params.id;
  var owner = req.session.passport.user.user_id;
  var text = req.body.comment;

  const db = require('../db.js');

  db.query("INSERT INTO comments(`photoTarget`, `userOrigin`, `text`) VALUES (?, ?, ?)", [photoTarget, owner, text], function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      res.status(200).render('./success');
    }
  });

});


//Profile routes
router.get('/profile', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');
  var query1 = "SELECT p.id, p.owner, p.link, p.description, u.username AS name, \
                (SELECT COUNT(*) FROM likes l WHERE l.photoTarget = p.id ) AS likes \
              FROM photos p \
              INNER JOIN users u ON p.owner= u.id\
              WHERE p.owner = "+ req.user.user_id +"\
              ORDER BY likes DESC, id ASC";

  db.query(query1, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      var photos = JSON.parse(JSON.stringify(result));

      var query2 = "SELECT c.id, c.text, c.photoTarget, c.userOrigin, u.username AS name\
                    FROM comments c \
                    INNER JOIN users u ON c.userOrigin = u.id";

      db.query(query2, function (err, result, fields) {
        if (err) res.status(107).send(err);
        else {
          var comments = JSON.parse(JSON.stringify(result));

          for (var i = 0; i < photos.length; i++) {
            photos[i].comments = [];
          }

          var commentAux = {
            id: 0,
            text: "text",
            photoTarget: 0,
            userOrigin: 0,
            name: "name"
          }

          for (var i = 0; i < photos.length; i++) {
            for (var j = 0; j < comments.length; j++) {
              if (photos[i].id == comments[j].photoTarget) {
                commentAux = comments[j];
              
                photos[i].comments.push(commentAux);
              }
            }
          }
        }
        res.render('profile', { title: "Baker's Profile", photos});
      });
    }
  });
});


//Confirmation routes
router.get('/photo_delete/:id', authenticationMiddleware(), function (req, res, next) {
  res.render('./confirm', { photo_ID: req.params.id });
});

router.get('/confirm', authenticationMiddleware(), function (req, res, next) {
  res.render('./confirm', { photo_ID: req.params.id });
});


router.get('/pilots_delete_final/:id', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');
  var query = "DELETE FROM `Pilots` WHERE pilot_ID=" + req.params.id;

  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      console.log(result);
      res.status(200).render('success');
    }
  })
});


module.exports = router;
