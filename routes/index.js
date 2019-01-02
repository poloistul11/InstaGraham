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
    const db = require('../db.js');


    var hash = bcrypt.hashSync(password, saltRounds);
    db.query('INSERT INTO Users(email, password_hash) VALUES (?, ?)', [email, hash], function (error, results, fields) {
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



/* Pilot routes */
router.get('/pilots', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');
  var query = "SELECT Pilots.`pilot_ID`, Pilots.`team_ID`, Pilots.`name`, \
                      Pilots.`country`, Pilots.`podiums`, Pilots.`points`,\
                      Pilots.`gpEntered`, Pilots.`wChampionships`, \
                      Pilots.`highestFinish`, Pilots.`birthday`, \
                      Teams.name AS nameTeam \
              FROM Pilots \
              INNER JOIN Teams ON Pilots.team_ID=Teams.team_ID \
              ORDER BY points DESC";
  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      var pilots = result
      res.render('pilots', { title: "Pilots", pilots });
    }
  });
});


router.get('/pilots/:id', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');

  var query = "SELECT * FROM Pilots Where pilot_ID = " + req.params.id;
  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      console.log(result);
      res.status(200).render('edit_pilot', { pilot: result[0] });
    }
  })
});


router.post('/edit_pilot/:id', authenticationMiddleware(), function (req, res, next) {
  var name = req.body.name;
  var country = req.body.country;
  var podiums = req.body.podiums;
  var points = req.body.points;
  var gpEntered = req.body.gpEntered;
  var wChampionships = req.body.wChampionships;
  var highestFinish = req.body.highestFinish;
  var id = req.body.id;

  const db = require('../db.js');

  var query = "UPDATE `Pilots` SET `name`=\"" + name +
    "\",`country`=\"" + country +
    "\",`podiums`=\"" + podiums +
    "\",`points`=\"" + points +
    "\",`gpEntered`=\"" + gpEntered +
    "\",`wChampionships`=\"" + wChampionships +
    "\",`highestFinish`=\"" + highestFinish +
    "\" " + "WHERE pilot_ID=" + id;
  console.log(query);

  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      console.log(result);
      res.status(200).render('success');
    }
  })

});


router.get('/pilots_new', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');
  var query = "SELECT * FROM Teams";

  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      var teams = result;
      res.status(200).render('./add_pilot', { teams: teams });
    }
  });
});


router.post('/pilots_new', authenticationMiddleware(), function (req, res, next) {

  req.checkBody('name', 'Name Field must be a text.').isString();
  req.checkBody('country', 'Country Field must be a text.').isString();
  req.checkBody('podiums', 'Podiums Field must be a number.').isNumeric();
  req.checkBody('points', 'Points Field must be a number.').isNumeric();
  req.checkBody('gpEntered', 'GP Entered Field must be a number.').isNumeric();
  req.checkBody('wChampionships', 'Won Championships Field must be a number.').isNumeric();
  req.checkBody('highestFinish', 'Highest Finish Field must be a number.').isNumeric();
  req.checkBody('birthDate', 'Birth Date Field must be a date.').isISO8601();
  req.checkBody('team_ID', 'Team Code Field must be completed.').isNumeric();

  const errors = req.validationErrors();
  //teams = req.body;
  if (errors) {
    res.render('add_pilot', {
      errors: errors
      //teams: teams
    });
  } else {
    var name = req.body.name;
    var country = req.body.country;
    var podiums = req.body.podiums;
    var points = req.body.points;
    var gpEntered = req.body.gpEntered;
    var wChampionships = req.body.wChampionships;
    var highestFinish = req.body.highestFinish;
    var birthDate = req.body.birthDate;
    var team_ID = req.body.team_ID;

    var query = "INSERT INTO `Pilots`(`team_ID`, `name`, `country` ," +
      "`podiums`, `points`, `gpEntered`, `wChampionships`, `highestFinish`,`birthday`) VALUES (" + team_ID + ", \"" + name + "\", \"" + country +
      "\", " + podiums + ", " + points + ", " + gpEntered + ", "
      + wChampionships + ", " + highestFinish + ", \"" + birthDate + "\")";

    console.log(query);

    const db = require('../db.js');

    db.query(query, function (err, result, fields) {
      if (err) res.status(107).send(err);
      else {
        res.status(200).render('./success');
      }
    });
  }
});


router.get('/pilots_delete/:id', authenticationMiddleware(), function (req, res, next) {
  res.render('./confirm', { pilot_ID: req.params.id, team_ID: 0 });
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



/* Team routes */
router.get('/teams', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');
  var query = "SELECT * FROM Teams ORDER BY worldChampionships DESC";
  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      var teams = result;
      res.render('teams', { title: "Teams", teams });
    }
  });
});


router.get('/teams/:id', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');

  var query = "SELECT * FROM Teams Where team_ID = " + req.params.id;
  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      console.log(result);
      res.status(200).render('edit_team', { team: result[0] });
    }
  })
});


router.post('/edit_team/:id', authenticationMiddleware(), function (req, res, next) {
  var name = req.body.name;
  var teamChief = req.body.teamChief;
  var technicalChief = req.body.technicalChief;
  var chassis = req.body.chassis;
  var powerUnit = req.body.powerUnit;
  var firstTeamEntry = req.body.firstTeamEntry;
  var worldChampionships = req.body.worldChampionships;
  var id = req.body.id;

  const db = require('../db.js');

  var query = "UPDATE `Teams` SET `name`=\"" + name +
    "\",`teamChief`=\"" + teamChief +
    "\",`technicalChief`=\"" + technicalChief +
    "\",`chassis`=\"" + chassis +
    "\",`powerUnit`=\"" + powerUnit +
    "\",`firstTeamEntry`=\"" + firstTeamEntry +
    "\",`worldChampionships`=\"" + worldChampionships +
    "\" " + "WHERE team_ID=" + id;
  console.log(query);

  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      console.log(result);
      res.status(200).render('success');
    }
  })
});


router.get('/teams_new', authenticationMiddleware(), function (req, res, next) {
  res.status(200).render('./add_team');
});


router.get('/teams_delete/:id', authenticationMiddleware(), function (req, res, next) {
  res.render('./confirm', { pilot_ID: 0, team_ID: req.params.id });
});


router.get('/teams_delete_final/:id', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');
  var query = "DELETE FROM `Teams` WHERE team_ID=" + req.params.id;

  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      console.log(result);
      res.status(200).render('success');
    }
  })
});


router.post('/teams_new', authenticationMiddleware(), function (req, res, next) {

  req.checkBody('name', 'Name Field must be a non-empty text.').isString().notEmpty();
  req.checkBody('teamChief', 'Team Chief Field must be a non-empty text.').isString().notEmpty();
  req.checkBody('technicalChief', 'Technical Chief Field must be a non-empty text.').isString().notEmpty();
  req.checkBody('chassis', 'Chasis Field must be a non-empty text.').isString().notEmpty();
  req.checkBody('powerUnit', 'Power Unit Field must be a non-empty text.').isString().notEmpty();
  req.checkBody('firstTeamEntry', 'First Team Entry Field must be a year.').isNumeric();
  req.checkBody('worldChampionships', 'Won World Championships Field must be a number.').isNumeric();
  req.checkBody('highestFinish', 'Highest Finish Field must be a number.').isNumeric();
  req.checkBody('polePositions', 'Pole Positions Field must be a number.').isNumeric();
  req.checkBody('fastestLaps', 'Fastest Laps Field must be a number.').isNumeric();

  const errors = req.validationErrors();
  if (errors) {
    res.render('add_team', {
      errors: errors
    });
  } else {
    var name = req.body.name;
    var teamChief = req.body.teamChief;
    var technicalChief = req.body.technicalChief;
    var chassis = req.body.chassis;
    var powerUnit = req.body.powerUnit;
    var firstTeamEntry = req.body.firstTeamEntry;
    var worldChampionships = req.body.worldChampionships;
    var highestFinish = req.body.highestFinish;
    var polePositions = req.body.polePositions;
    var fastestLaps = req.body.fastestLaps;

    var query = "INSERT INTO `Teams`(`name`, `teamChief`, `technicalChief`,`chassis`, `powerUnit`," +
      "`firstTeamEntry`, `worldChampionships`, `highestRaceFinish`, `polePositions`, `fastestLaps`)" +
      "VALUES ( \"" + name + "\", \"" + teamChief + "\", \"" + technicalChief + "\", \"" + chassis + "\", \"" +
      powerUnit + "\", " + firstTeamEntry + ", " + worldChampionships + ", " + highestFinish + ", " +
      polePositions + ", " + fastestLaps + ")";

    console.log(query);

    const db = require('../db.js');

    db.query(query, function (err, result, fields) {
      if (err) res.status(107).send(err);
      else {
        res.status(200).render('./success');
      }
    });
  }
});



/* Circuit routes */
router.get('/circuits', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');
  var query = "SELECT Circuits.`circuit_ID`, Circuits.`name`, Circuits.`mostWinsPilot`, \
                      Circuits.`mostWinsTeam`, Circuits.`timesHeld`, Circuits.`firstHeld`, \
                      Circuits.`circuitLength`, Circuits.`laps`, Teams.name AS nameTeam, \
                      Pilots.name as namePilot \
              FROM Circuits \
              INNER JOIN Teams ON Circuits.mostWinsTeam = Teams.team_ID \
              INNER JOIN Pilots ON Circuits.mostWinsPilot = Pilots.pilot_ID \
              ORDER BY circuit_ID";
  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      var circuits = result;
      res.render('circuits', { title: "Circuits", circuits });
    }
  });
});



/* Result routes */
router.get('/results', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');

  var query = "SELECT * FROM Circuits";
  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      console.log(result);
      var results = result;
      res.render('results', { title: "Results", results });
    }
  });
});


router.get('/results/teams/:id', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');

  var query = "SELECT CircuitTeam.`ID`, CircuitTeam.`team_ID`, CircuitTeam.`circuit_ID`, \
                      CircuitTeam.`dateRace`, CircuitTeam.`place`, CircuitTeam.time, Teams.name AS nameTeam, \
                      Circuits.name AS nameCircuit \
              FROM CircuitTeam \
              INNER JOIN Teams ON CircuitTeam.team_ID = Teams.team_ID \
              INNER JOIN Circuits ON CircuitTeam.circuit_ID = Circuits.circuit_ID \
              WHERE CircuitTeam.circuit_ID = " + req.params.id + " \
              ORDER BY place ASC"

  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      console.log(result);
      var results = result;
      var location = result[0].nameCircuit;
      var date = result[0].dateRace;
      res.render('results_teams', { title: "Teams - Results", location, date, results });
    }
  });
});



router.post('/results/teams2', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');

  var query = "SELECT CircuitTeam.`ID`, CircuitTeam.`team_ID`, CircuitTeam.`circuit_ID`, \
                      CircuitTeam.`dateRace`, CircuitTeam.`place`, CircuitTeam.time, Teams.name AS nameTeam, \
                      Circuits.name AS nameCircuit \
              FROM CircuitTeam \
              INNER JOIN Teams ON CircuitTeam.team_ID = Teams.team_ID \
              INNER JOIN Circuits ON CircuitTeam.circuit_ID = Circuits.circuit_ID \
              WHERE Teams.name LIKE \'%" +req.body.team + "%\' \
              ORDER BY place ASC"

  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      console.log(result);
      var results = result;
      res.render('results_teams2', { title: "Teams - Results", results });
    }
  });
});


router.post('/results/pilots2', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');

  var query = "SELECT CircuitPilot.ID ,CircuitPilot.pilot_ID, CircuitPilot.circuit_ID , CircuitPilot.place, \
	              Pilots.name AS namePilot, Circuits.name AS nameCircuit \
              FROM CircuitPilot\
              INNER JOIN Pilots ON CircuitPilot.pilot_ID = Pilots.pilot_ID \
              INNER JOIN Circuits ON CircuitPilot.circuit_ID = Circuits.circuit_ID \
              WHERE Pilots.name LIKE \"%"+req.body.pilot+"%\"\
              ORDER BY place ASC";

      console.log(query);
  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      console.log(result);
      var results = result;
      res.render('results_pilots2', { title: "Pilots - Results", results });
    }
  });
});


router.get('/results/pilots/:id', authenticationMiddleware(), function (req, res, next) {
  const db = require('../db.js');

  var query = "SELECT CircuitPilot.`ID`, CircuitPilot.`pilot_ID`, CircuitPilot.`circuit_ID`, \
                      CircuitPilot.`dateRace`, CircuitPilot.`place`, Pilots.name AS namePilot, \
                      Circuits.name AS nameCircuit \
              FROM CircuitPilot \
              INNER JOIN Pilots ON CircuitPilot.pilot_ID = Pilots.pilot_ID \
              INNER JOIN Circuits ON CircuitPilot.circuit_ID = Circuits.circuit_ID \
              WHERE CircuitPilot.circuit_ID = " + req.params.id + " \
              ORDER BY place ASC"

  db.query(query, function (err, result, fields) {
    if (err) res.status(107).send(err);
    else {
      console.log(result);
      var results = result;
      var location = result[0].nameCircuit;
      var date = result[0].dateRace;
      res.render('results_pilots', { title: "Pilots - Results", location, date, results });
    }
  });
});



/* Stats routes */
router.get('/stats', authenticationMiddleware(), function (req, res, next) {
  res.status(200).render('stats', { title: "Stats" });
});


router.post('/stats/positionP', authenticationMiddleware(), function(req, res, next){
  const db = require('../db.js');

  var query = "SELECT P.pilot_ID, P.name,\
                ( SELECT COUNT(*) FROM CircuitPilot CP WHERE\
                  CP.pilot_ID = P.pilot_ID AND CP.place <= "+ req.body.pozitie +" ) AS NrCurse\
               FROM Pilots P";

  db.query(query,function(err, result, fields){
    if(err)
      res.status(107).send(err);
    else{
      res.status(200).render('results2', {title: "Numarul de clasari pe o pozitie superioara celei introduse",
                              result1: result});
    }
  });

});


router.post('/stats/positionT', authenticationMiddleware(), function(req, res, next){
  const db = require('../db.js');

  var query = "SELECT T.team_ID, T.name,\
                ( SELECT COUNT(*) FROM CircuitTeam CT WHERE CT.team_ID = T.team_ID AND\
                 CT.dateRace BETWEEN '" + req.body.data1 + "' AND '" + req.body.data2 + "') AS NrCurse\
              FROM Teams T\
              ORDER BY team_ID ";

  db.query(query,function(err, result, fields){
    if(err)
      res.status(107).send(err);
    else{
      var linie = result[0];
      console.log(linie.name);
      res.status(200).render('results2', {title: "Numarul de curse la care echipele au participat intre datele date",
                            result2: result });
    }
  });
});


router.post('/stats/averageT', authenticationMiddleware(), function(req, res, next){
  const db = require('../db.js');

  var query = "SELECT T.team_ID, T.name,\
                ( SELECT AVG(CT.place) FROM CircuitTeam CT WHERE\ CT.team_ID=" + req.body.code + " ) AS medie\
              FROM Teams T\
              WHERE T.team_ID=" + req.body.code ;

  db.query(query,function(err, result, fields){
    if(err)
      res.status(107).send(err);
    else{ 
      res.status(200).render('results2', {title:"Media pozitiilor echipelor", result3: result });
    }
  });
});


router.post('/stats/participateT', authenticationMiddleware(), function(req, res, next){
  const db = require('../db.js');

  var query ="SELECT T.team_ID, T.name\
              FROM Teams T\
              WHERE T.team_ID NOT IN\
                (SELECT T.team_ID FROM Teams T, CircuitTeam CT\
                WHERE T.team_ID = CT.team_ID)";

  db.query(query,function(err, result, fields){
    if(err)
      res.status(107).send(err);
    else{
      res.status(200).render('results2', {title:"Echipe care nu au participat la nici o cursa", result4: result });
    }
  });
});


module.exports = router;
