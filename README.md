# Setup

Clone the repo and install dependencies using `npm`:

```bash
git clone https://github.com/VROOM-Project/vroom-express.git
cd vroom-express
npm install
```

# Requirements

- [OSRM](https://github.com/Project-OSRM/osrm-backend/wiki/Building-OSRM)
   v5.0.0 or later.
- [VROOM](https://github.com/VROOM-Project/vroom/wiki/Building) v1.0.0
   or later

# Usage

Run the server using:
```bash
npm start
```

Provided everything is fine with your VROOM and OSRM setup, you should
now be able to run queries like:

```bash
curl --header "Content-Type:application/json" --data '{"vehicles":[{"id":0,"start":[2.3526,48.8604],"end":[2.3526,48.8604]}],"jobs":[{"id":0,"location":[2.3691,48.8532]},{"id":1,"location":[2.2911,48.8566]}],"options":{"g":true}}' http://localhost:3000
```

See the
[API documentation](https://github.com/VROOM-Project/vroom/blob/master/docs/API.md)
for input syntax.

# Customization

Launch with

```bash
node src/index.js
```

and add command-line parameters (see `args` variable at the beginning
of `src/index.js`). This includes options to:

- set a max number of locations in handled queries;
- set the `vroom` exec path on the system (if not found in `PATH`);
- set the default wrt the detailed route geometry display;
- set address and port for `osrm-routed`;
- set directory for `access.log` file;

