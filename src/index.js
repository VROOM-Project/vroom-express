var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var helmet = require('helmet');

// Config variables.
var VROOM_PATH = '';
var MAX_LOCATION_NUMBER = 50;
var ROUTE_GEOMETRY = false;
var USE_OSRM_V5 = true;
var OSRM_ADDRESS = "0.0.0.0";
var OSRM_PORT = "5000";
var ALLOW_OPTIONS_OVERRIDE = true; // -g only so far.

// App and loaded modules.
var app = express();

// Enable cross-origin ressource sharing.
app.use(function(req, res, next){
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers",
             "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.json());
app.use(morgan('combined'));
app.use(helmet());

// Callback for size and some input validity checks.
var cb_size_check = function (req, res, next){
  res.setHeader('Content-Type', 'application/json');

  var correct_input = ('jobs' in req.body)
      && ('vehicles' in req.body)
      && (req.body['vehicles'].length >= 1);

  if(!correct_input){
    res.send({code: 1, error: 'Invalid query.'});
    return;
  }

  var nb_locs = req.body['jobs'].length;
  if('start' in req.body['vehicles'][0]){
    nb_locs += 1;
  }
  if('end' in req.body['vehicles'][0]){
    nb_locs += 1;
  }
  if(nb_locs > MAX_LOCATION_NUMBER){
    console.log('Too many locs in query (' + nb_locs + ')');
    res.send({code: 1, error: 'Too many locations.'});
    return;
  }
  next();
}

// Cli wrapper and associated callback.
var exec = require('child_process').exec;

var command = VROOM_PATH + 'vroom ';
var options = '-a ' + OSRM_ADDRESS + ' -p ' + OSRM_PORT + ' ';
if(ROUTE_GEOMETRY){
  options += '-g ';
}
if(USE_OSRM_V5){
  // As of v5.1.0, profile name doesn't matter, so car will do until
  // it should be made into a variable.
  options += '-m car ';
}

var cb_exec = function (req, res){
  var req_options = '';
  if(!ROUTE_GEOMETRY && ALLOW_OPTIONS_OVERRIDE
     && 'options' in req.body && 'g' in req.body['options']
     && req.body['options']['g']){
    req_options = '-g ';
  }
  exec(command + options + req_options + '\'' + JSON.stringify(req.body) + '\'',
       // TODO find a better way to deal with big outputs.
       {'maxBuffer': 5000*1024},
       function(error, stdout, stderr){
         res.send(stdout);
         if(error !== null){
           console.log(error);
         }
       }
      );
}

app.post('/', [cb_size_check, cb_exec]);

app.listen(3000, function (){
  console.log('vroom-express listening on port 3000!');
});
