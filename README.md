# Requirements

- Access to a routing engine ([OSRM](https://github.com/Project-OSRM/osrm-backend/wiki/Building-OSRM) or [OpenRouteService](https://github.com/GIScience/openrouteservice/))
- [VROOM](https://github.com/VROOM-Project/vroom/wiki/Building)

# Setup

- Clone the repo

```bash
git clone https://github.com/VROOM-Project/vroom-express.git
cd vroom-express
```

- Checkout the relevant release depending on your `vroom` version

```bash
git checkout v0.4.2             # For vroom v1.4
git checkout v0.3.0             # For vroom v1.3
```

- Install dependencies using `npm`

```bash
npm install
```

# Usage

Run the server using:

```bash
npm start
```

Provided everything is fine with your VROOM and routing setup, you
should now be able to run queries like:

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

- adjust the max number of jobs or vehicles in handled queries;
- adjust the `vroom` exec path on the system (if not found in `$PATH`);
- set the default wrt the detailed route geometry display;
- set directory for `access.log` file;
