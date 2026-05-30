# dslm-data static prototype

This repository contains a static frontend prototype for `dslm-data`. It focuses on two product areas:

- Data Assets: data source onboarding, asset inventory, build tasks, artifacts, source changes, and audit trails.
- Data Metrics: problem-driven metric asset creation, metric governance, Metric DSL preview, output assets, and publish confirmation.

Data Analytics and Data Tasks are represented as planned modules on the home page, but their detailed flows are not implemented yet.

## Project Layout

```text
.
├── data-metrics-problem-driven-plan.md  # Product design for the Data Metrics problem-driven flow
├── docs/
│   ├── key-flows.md                     # Main user flows and page responsibilities
│   └── page-route-map.md                # Mermaid page route diagram
└── web/
    ├── index.html                       # Home dashboard
    ├── sources.html                     # Data Assets source list
    ├── metrics.html                     # Data Metrics workbench
    ├── *.html                           # Static feature pages
    ├── css/                             # Design tokens, layout, components, page styles
    └── js/
        ├── common.js                    # Shared DOM helpers and UI behavior
        ├── mock-data-assets.js          # Data Assets mock data
        ├── mock-data-metrics.js         # Data Metrics mock data
        ├── data-assets-api.js           # Data Assets API facade
        ├── data-metrics-api.js          # Data Metrics API facade
        └── *.js                         # Page-specific behavior
```

## Running Locally

This is a static prototype. Open `web/index.html` directly in a browser, or serve the `web/` directory with any static file server.

```sh
python3 -m http.server 8000 --directory web
```

Then visit `http://127.0.0.1:8000/`.

## Architecture Notes

- The frontend uses plain HTML, CSS, and JavaScript. There is no package manager, bundler, framework, or backend service in this repository.
- Page behavior is organized by one JavaScript file per page or feature area.
- Shared UI helpers are exposed through `window.UI` in `web/js/common.js`; generated status labels now pass through shared HTML escaping.
- Data Assets pages read through `window.DataAssetsApi`, backed by `web/js/mock-data-assets.js` while the prototype is static.
- Data Metrics pages read through `window.DataMetricsApi`, backed by `web/js/mock-data-metrics.js` while the prototype is static.
- Some interactions simulate backend behavior in the browser. Build task preview and creation now live behind `window.DataAssetsApi`, with `window.BackendApi` kept as a compatibility alias.

## Documentation

- [Page route map](docs/page-route-map.md)
- [Key flows](docs/key-flows.md)
- [Data Metrics product plan](data-metrics-problem-driven-plan.md)

## Verification

The current lightweight verification step is JavaScript syntax checking:

```sh
find web/js -name '*.js' -exec node --check {} \;
```

Before connecting real APIs, add browser smoke tests for the main routes and replace direct `innerHTML` rendering with safer rendering helpers where user or backend data can appear.
