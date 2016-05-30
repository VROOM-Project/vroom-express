# Setup

Clone the repo and install dependencies using `npm`:

```bash
git clone https://github.com/VROOM-Project/vroom-express.git
cd vroom-express
npm install
```

# Usage

Run the server using:
```bash
npm start
```

Provided everything is fine with your VROOM and OSRM setup, you should
now be able to run queries.

```bash
curl --header "Content-Type:application/json" --data '{"vehicles":[{"start":[48.859,2.294]}],"jobs":[{"id":1,"location":[48.86,2.352]},{"id":2,"location":[48.831,2.356]}]}' http://localhost:3000
```

# Customization

A bunch of variables can be used to adapt the server behaviour, see
beginning of `src/index.js` file. This includes options to:

- set a max number of locations in handled queries;
- set the `vroom` exec path on the system (if not found in `PATH`);
- set the default wrt the detailed route geometry display;
- choose to use new v5.\* OSRM API or older v4.\*;
- set OSRM server address and port;
- allow to override some of the above at query time.
