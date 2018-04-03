'use strict';

var express = require('express');
var fs = require('fs');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var helmet = require('helmet');
var minimist = require('minimist');

// Config variables.
let args = minimist(process.argv.slice(2), {
  alias: {
    p: 'port',
  },
  boolean: [
    'geometry',
    'libosrm',
    'override'
  ],
  default: {
    port: 3000,
    path: '',
    maxjobs: '1000',
    geometry: false,
    libosrm: false,
    osrm_address: "0.0.0.0",
    osrm_port: 5000,
    override: true, // -g only so far.
    logdir: __dirname + '/..',
    limit: '500kb',
    timeout: 5 * 60 * 1000 // milli-seconds.
  }
});

var PORT = args['port'];
var VROOM_PATH = args['path'];
var MAX_JOB_NUMBER = args['maxjobs'];
var ROUTE_GEOMETRY = args['geometry'];
var USE_LIBOSRM = args['libosrm'];
var OSRM_ADDRESS = args['osrm_address'];
var OSRM_PORT = args['osrm_port'];
var ALLOW_OPTIONS_OVERRIDE = args['override']; // -g only so far.
var LOG_DIRNAME = args['logdir'];
var INPUT_SIZE_LIMIT = args['limit'];
var CUSTOM_TIMEOUT = args['timeout']; // milli-seconds.


// App and loaded modules.
var app = express();

// Enable cross-origin ressource sharing.
app.use(function(req, res, next){
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers",
             "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.json({limit: INPUT_SIZE_LIMIT}));
app.use(bodyParser.urlencoded({limit: INPUT_SIZE_LIMIT, extended: true}));

var accessLogStream = fs.createWriteStream(LOG_DIRNAME + '/access.log',
                                           {flags: 'a'});
app.use(morgan('combined', {stream: accessLogStream}));

app.use(helmet());

app.use(function(err, req, res, next){
  res.setHeader('Content-Type', 'application/json');
  if(err instanceof SyntaxError && err.status === 400 && 'body' in err){
    console.log(now() + ' - ' + 'Invalid JSON');
    res.send({code: 1, error: 'Invalid json.'});
  }
});

// Simple date generator for console output.
var now = function(){
  var date = new Date();
  return date.toUTCString();
}

// Callback for size and some input validity checks.
var sizeCheckCallback = function(maxJobNumber){
  return function (req, res, next){
    var correctInput = ('jobs' in req.body)
        && ('vehicles' in req.body)
        && (req.body['vehicles'].length >= 1);

    if(!correctInput){
      res.send({code: 1, error: 'Invalid query.'});
      return;
    }

    if(req.body['jobs'].length > maxJobNumber){
      console.log(now()
                  + ' - Too many jobs in query ('
                  + req.body['jobs'].length + ')');
      res.send({code: 1, error: 'Too many jobs.'});
      return;
    }
    next();
  }
}

// Cli wrapper and associated callback.
var spawn = require('child_process').spawn;

var vroomCommand = VROOM_PATH + 'vroom';
var options = [];
if(USE_LIBOSRM){
  options.push('-l');
}
else{
  options.push('-a', OSRM_ADDRESS);
  options.push('-p', OSRM_PORT);
}
if(ROUTE_GEOMETRY){
  options.push('-g');
}

// As of v5.1.0, profile name doesn't matter, so car will do until it
// should be made into a variable.
options.push('-m', 'car');

var execCallback = function (req, res){
  var reqOptions = options.slice();
  if(!ROUTE_GEOMETRY && ALLOW_OPTIONS_OVERRIDE
     && 'options' in req.body && 'g' in req.body['options']
     && req.body['options']['g']){
    reqOptions.push('-g');
  }

  reqOptions.push(JSON.stringify(req.body));
  var vroom = spawn(vroomCommand, reqOptions);

  vroom.on('error', function(err){
    console.log(now() + ' - ' + err);
    res.send({code: 1, error: 'Unfound command: ' + vroomCommand});
  });

  vroom.stdout.pipe(res);

  vroom.stderr.on('data', function (data){
    console.log(now() + ' - ' + data.toString());
  });
}

app.post('/', [sizeCheckCallback(MAX_JOB_NUMBER), execCallback]);

var server = app.listen(PORT, function (){
  console.log('vroom-express listening on port ' + PORT + '!');
});

server.setTimeout(CUSTOM_TIMEOUT);
