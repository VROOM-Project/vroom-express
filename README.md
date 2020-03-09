# Requirements

- Access to a routing engine ([OSRM](https://github.com/Project-OSRM/osrm-backend/wiki/Building-OSRM) or [OpenRouteService](https://github.com/GIScience/openrouteservice/))
- [VROOM](https://github.com/VROOM-Project/vroom/wiki/Building)

# Setup

- Clone the repo

```bash
git clone https://github.com/VROOM-Project/vroom-express.git
cd vroom-express
git checkout v0.5.0
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

Adjust `./config.yml` to your needs.

Optionally set `VROOM_ROUTER=<router>`, `router` being `osrm` (default), `libosrm` or `ors`. Using the environment variable **will override the config.yml `router` setting**.
