# Key Flows

## Data Assets: Source Onboarding

1. Start from `sources.html`.
2. Choose `source-create.html`.
3. Select one source type:
   - `database-create.html` for relational databases.
   - `file-sources.html` for file systems.
   - `web-create.html` for web data.
4. For file systems, choose local upload, S3 / MinIO, or FTP / SFTP.
5. Save the source and land on `local-upload-detail.html`.

The prototype simulates validation and save behavior in the browser. The target detail page uses query parameters such as `sourceId` to switch source context.

## Data Assets: Build And Maintain Assets

1. Open a data source detail page.
2. Review source profile, build coverage, source changes, artifacts, and audit events.
3. Open `build-task.html` to preview a build task.
4. Select build scope and parse strategy.
5. Preview backend-generated pipeline steps through `window.BackendApi`.
6. Create the task and continue to `task-detail.html`.
7. Use runtime actions such as start, stop, retry, continue, or delete in modal flows.

File assets and database assets share the same detail shell, but database sources additionally expose the model graph and field metadata workbench.

## Data Assets: Database Model Graph

1. Open a database source in `local-upload-detail.html?sourceId=...`.
2. Use the embedded model graph section for quick inspection.
3. Open `database-model-graph.html` for a full-screen relationship graph.
4. Filter by schema, object type, build status, relation type, and graph scope.
5. Inspect object details and edit table or field semantic metadata in the workbench.

The graph is rendered with SVG and browser state. It does not persist edits to a backend. Data currently comes through `window.DataAssetsApi`, so replacing mock data with real endpoints should start in `web/js/data-assets-api.js`.

## Data Metrics: Problem-Driven Generation

1. Start from `metrics.html`.
2. Click `metric-generate.html`.
3. Complete the eight-step wizard:
   - Describe the business problem.
   - Confirm intent and metric scope.
   - Confirm business theme.
   - Confirm analysis directions.
   - Review recommended data models.
   - Confirm dimensions and metrics.
   - Confirm compute mode and output assets.
   - Review and publish.
4. Publishing stores the result payload in `sessionStorage`.
5. `metric-publish-result.html` reads the payload and shows generated assets, reused assets, output assets, and follow-up actions.

The Data Metrics design intent is documented in `data-metrics-problem-driven-plan.md`. The wizard keeps advanced governance concepts mostly in the background while still exposing Metric DSL, reuse suggestions, and shared output asset decisions.

## Data Metrics: Browse Governed Assets

1. Open `metrics.html`.
2. Filter or select a business theme.
3. Open `metric-system-detail.html?theme=...`.
4. Review theme KPIs, quality checks, directions, metric sets, dimensions, metrics, output assets, and lineage-style DAG blocks.
5. Open `metric-direction-detail.html` for a direction-level view.
6. Open `metric-output-asset-detail.html` for SQL, compute, lineage, and downstream context.

Theme and direction data is loaded through `window.DataMetricsApi`, backed by `web/js/mock-data-metrics.js` in the static prototype.
