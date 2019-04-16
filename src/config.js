function ErrorCodes(arg1, arg2) {
  this.input = {
    code: 4000,
    message:
      "Invalid JSON object in request, please add jobs and vehicles to the object body"
  };
  this.vehicles = {
    code: 4001,
    message: [
      "Too many vehicles (",
      arg1,
      ") in query, maximum is set to",
      arg2
    ].join(" ")
  };
  this.jobs = {
    code: 4002,
    message: [
      "Too many jobs (",
      arg1,
      ") in query, maximum is set to",
      arg2
    ].join(" ")
  };
  this.routing = {
    code: 4003,
    message: "Routing error.."
  };
  this.internal = {
    code: 4099,
    message: ["Unknown internal error", arg1].join(" ")
  };
}

module.exports = {
  ErrorCodes: ErrorCodes
};
