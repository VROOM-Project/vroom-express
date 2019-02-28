'use strict';

var express = require('express');
var fs = require('fs');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var helmet = require('helmet');
var minimist = require('minimist');

// Config variables.
var args = minimist(process.argv.slice(2), {
  alias: {
    p: 'port',
    r: 'router',
  },
  boolean: [
    'geometry',
    'override'
  ],
  default: {
    port: 3000,                 // expressjs port
    path: '',                   // VROOM path (if not in $PATH)
    maxjobs: '1000',            // max number of jobs
    maxvehicles: '200',         // max number of vehicles
    geometry: false,            // retrieve geometry (-g)
    router: "osrm",             // routing backend (osrm, libosrm or ors)
    override: true,             // allow cl option override (-g only so far)
    logdir: __dirname + '/..',  // put logs in there
    limit: '1mb',               // max request size
    timeout: 5 * 60 * 1000      // milli-seconds.
  }
});

// For each routing profile add a host and a port for use with osrm
// and ors.
var routingServers = {
  'car': {
    'host': '0.0.0.0',
    'port': '5000'
  }
}

// Hard-code error codes 1, 2 and 3 as defined in vroom. Add 4 code
// for size checks.
var errorCode = {
  'internal': 1,
  'input': 2,
  'routing': 3,
  'tooLarge': 4
}

// App and loaded modules.
var app = express();

// Enable cross-origin ressource sharing.
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers",
             "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.json({limit: args['limit']}));
app.use(bodyParser.urlencoded({limit: args['limit'], extended: true}));

var accessLogStream = fs.createWriteStream(args['logdir'] + '/access.log',
                                           {flags: 'a'});

app.use(morgan('combined', {stream: accessLogStream}));

app.use(helmet());

app.use(function(err, req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.log(now() + ' - ' + 'Invalid JSON');
    res.status(400);
    res.send({code: errorCode.input, error: 'Invalid json.'});
  }
});

// Simple date generator for console output.
var now = function() {
  var date = new Date();
  return date.toUTCString();
}

var logToFile = function(input) {
  var date = new Date();
  var timestamp = Math.floor(Date.now() / 1000);

  var fileName = args['logdir'] + '/' + timestamp + '.json';
  fs.writeFileSync(fileName,
                   input,
                   function (err, data) {
                     if (err) {
                       console.log(now() + err);
                     }
                   });

  return fileName;
}

// Callback for size and some input validity checks.
var sizeCheckCallback = function(maxJobNumber, maxVehicleNumber) {
  return function (req, res, next) {
    var correctInput = ('jobs' in req.body)
        && ('vehicles' in req.body);

    if (!correctInput) {
      res.status(400);
      res.send({code: errorCode.input, error: 'Invalid query.'});
      return;
    }

    if (req.body['jobs'].length > maxJobNumber) {
      console.log(now()
                  + ' - Too many jobs in query ('
                  + req.body['jobs'].length + ')');
      res.status(413);
      res.send({code: errorCode.tooLarge, error: 'Too many jobs.'});
      return;
    }
    if (req.body['vehicles'].length > maxVehicleNumber) {
      console.log(now()
                  + ' - Too many vehicles in query ('
                  + req.body['vehicles'].length + ')');
      res.status(413);
      res.send({code: errorCode.tooLarge, error: 'Too many vehicles.'});
      return;
    }
    next();
  }
}

// Cli wrapper and associated callback.
var spawn = require('child_process').spawn;

var vroomCommand = args['path'] + 'vroom';
var options = [];
options.push('-r', args['router']);
if (args['router'] != 'libosrm') {
  for (var profileName in routingServers) {
    var profile = routingServers[profileName];
    if ('host' in profile && 'port' in profile) {
      options.push('-a', profileName + ":" + profile['host']);
      options.push('-p', profileName + ":" + profile['port']);
    } else {
      console.log("Incomplete configuration: profile '" +
        profileName + "' requires 'host' and 'port'.");
      return;
    }
  }
}
if (args['geometry']) {
  options.push('-g');
}

var execCallback = function (req, res) {
  var reqOptions = options.slice();
  if (!args['geometry'] && args['override']
     && 'options' in req.body && 'g' in req.body['options']
     && req.body['options']['g']) {
    reqOptions.push('-g');
  }


  var fileName = logToFile(JSON.stringify(req.body));
  reqOptions.push('-i ' + fileName);

  var vroom = spawn(vroomCommand, reqOptions, {shell: true});

  // Handle errors.
  vroom.on('error', function(err) {
    console.log(now() + ' - ' + err);
    res.status(500);
    res.send({code: errorCode.internal, error: 'Unfound command.'});
  });

  vroom.stderr.on('data', function (data) {
    console.log(now() + ' - ' + data.toString());
  });

  // Handle solution. The temporary solutionBuffer variable is
  // required as we also want to adjust the status that is only
  // retrieved with 'exit', after data is written in stdout.
  var solutionBuffer;

  vroom.stdout.on('data', function (sol) {
    solutionBuffer = sol;
  });

  vroom.on('exit', function (code, signal) {
    switch (code) {
    case 0:
      res.status(200);
      break;
    case 1:
      // Internal error.
      res.status(500);
      break;
    case 2:
      // Input error.
      res.status(400);
      break;
    case 3:
      // Routing error.
      res.status(500);
      break;
    }
    res.send(solutionBuffer);

    fs.unlinkSync(fileName);
  });
}

app.post('/', [sizeCheckCallback(args['maxjobs'], args['maxvehicles']), execCallback]);

var server = app.listen(args['port'], function () {
  console.log('vroom-express listening on port ' + args['port'] + '!');
});

server.setTimeout(args['timeout']);
