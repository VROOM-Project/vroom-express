'use strict';

var bodyParser = require('body-parser');
var express = require('express');
var fs = require('fs');
var helmet = require('helmet');
var morgan = require('morgan');
var uuid = require('node-uuid');
var config = require("./config");

// App and loaded modules.
var app = express();

// Enable cross-origin ressource sharing.
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers",
             "Origin, X-Requested-With, Content-Type, Accept");
  res.setHeader('Content-Type', 'application/json');
  next();
});

var args = config.cliArgs;
app.use(bodyParser.json({limit: args['limit']}));
app.use(bodyParser.urlencoded({limit: args['limit'], extended: true}));

var accessLogStream = fs.createWriteStream(args['logdir'] + '/access.log',
                                           {flags: 'a'});

app.use(morgan('combined', {stream: accessLogStream}));

app.use(helmet());

app.use(function(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    var message =
      "Invalid JSON object in request, please add jobs and vehicles to the object body";
    console.log(now() + ": " + JSON.stringify(message));
    res.status(400);
    res.send({
      code: config.errorCodes.input,
      error: message
    });
  }
});

// Simple date generator for console output.
var now = function() {
  var date = new Date();
  return date.toUTCString();
};

var logToFile = function(input) {
  var date = new Date();
  var timestamp = Math.floor(Date.now() / 1000);

  var fileName = args['logdir'] + '/' + timestamp + '_' + uuid.v1() + '.json';
  fs.writeFileSync(fileName,
                   input,
                   function (err, data) {
                     if (err) {
                       console.log(now() + err);
                     }
                   });

  return fileName;
};

var fileExists = function(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
};

// Callback for size and some input validity checks.
var sizeCheckCallback = function(maxJobNumber, maxVehicleNumber) {
  return function(req, res, next) {
    var correctInput = "jobs" in req.body && "vehicles" in req.body;
    if (!correctInput) {
      var message = "Invalid JSON object in request, please add jobs and vehicles to the object body";
      console.error(now() + ": " + JSON.stringify(message));
      res.status(400);
      res.send({
        code: config.errorCodes.input,
        error: message
      });
      return;
    }

    if (req.body["jobs"].length > maxJobNumber) {
      var jobs = req.body["jobs"].length;
      var message = [
        "Too many jobs (",
        jobs,
        ") in query, maximum is set to",
        maxJobNumber
      ].join(" ");
      console.error(now() + ": " + JSON.stringify(message));
      res.status(413);
      res.send({
        code: config.errorCodes.tooLarge,
        error: message
      });
      return;
    }
    if (req.body["vehicles"].length > maxVehicleNumber) {
      var vehicles = req.body["vehicles"].length;
      var message = [
        "Too many vehicles (",
        vehicles,
        ") in query, maximum is set to",
        maxVehicleNumber
      ].join(" ");
      console.error(now() + ": " + JSON.stringify(message));
      res.status(413);
      res.send({
        code: config.errorCodes.tooLarge,
        error: message
      });
      return;
    }
    next();
  };
};

// Cli wrapper and associated callback.
var spawn = require('child_process').spawn;

var vroomCommand = args['path'] + 'vroom';
var options = [];
options.push('-r', args['router']);
if (args['router'] != 'libosrm') {
  var routingServers = config.routingServers;
  for (var profileName in routingServers) {
    var profile = routingServers[profileName];
    if ('host' in profile && 'port' in profile) {
      options.push('-a', profileName + ":" + profile['host']);
      options.push('-p', profileName + ":" + profile['port']);
    } else {
      console.error(
        "Incomplete configuration: profile '" +
          profileName +
          "' requires 'host' and 'port'."
      );
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
  vroom.on("error", function(err) {
    var message = ["Unknown internal error", err].join(": ");
    console.error(now() + ": " + JSON.stringify(message));
    res.status(500);
    res.send({
      code: config.errorCodes.internal,
      error: message
    });
  });

  vroom.stderr.on("data", function(data) {
    console.error(now() + ": " + data.toString());
  });

  // Handle solution. The temporary solution variable is required as
  // we also want to adjust the status that is only retrieved with
  // 'exit', after data is written in stdout.
  var solution = '';

  vroom.stdout.on('data', function (data) {
    solution += data.toString();
  });

  vroom.on('close', function (code, signal) {
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
    res.send(solution);

    if (fileExists(fileName)) {
      fs.unlinkSync(fileName);
    }
  });
};

app.post('/', [sizeCheckCallback(args['maxjobs'], args['maxvehicles']), execCallback]);

var server = app.listen(args['port'], function () {
  console.log('vroom-express listening on port ' + args['port'] + '!');
});

server.setTimeout(args['timeout']);
