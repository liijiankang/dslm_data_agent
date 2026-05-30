# Page Route Map

The prototype is organized around the home page, Data Assets, and Data Metrics. Data Analytics and Data Tasks are visible on the home page as planned modules only.

```mermaid
flowchart TD
  Home["index.html<br/>dslm-data home"]

  Home --> Sources["sources.html<br/>Data Assets"]
  Home --> Metrics["metrics.html<br/>Data Metrics"]
  Home -. planned .-> Analytics["Data Analytics<br/>planned"]
  Home -. planned .-> Tasks["Data Tasks<br/>planned"]

  Sources --> SourceCreate["source-create.html<br/>Choose source type"]
  SourceCreate --> DatabaseCreate["database-create.html<br/>Database source"]
  SourceCreate --> FileSources["file-sources.html<br/>File source type"]
  SourceCreate --> WebCreate["web-create.html<br/>Web source"]

  FileSources --> LocalUploadCreate["local-upload-create.html<br/>Local upload"]
  FileSources --> ObjectStorageCreate["object-storage-create.html<br/>S3 / MinIO"]
  FileSources --> FtpCreate["ftp-sftp-create.html<br/>FTP / SFTP"]

  Sources --> SourceDetail["local-upload-detail.html<br/>Source detail"]
  DatabaseCreate --> SourceDetail
  LocalUploadCreate --> SourceDetail
  ObjectStorageCreate --> SourceDetail
  FtpCreate --> SourceDetail
  WebCreate --> SourceDetail

  SourceDetail --> AssetDetail["asset-detail.html<br/>Asset detail"]
  SourceDetail --> BuildTask["build-task.html<br/>Create build task"]
  SourceDetail --> TaskDetail["task-detail.html<br/>Build task detail"]
  SourceDetail --> ModelGraph["database-model-graph.html<br/>Database model graph"]
  AssetDetail --> BuildTask
  BuildTask --> TaskDetail

  Metrics --> MetricGenerate["metric-generate.html<br/>Metric generation wizard"]
  Metrics --> MetricTheme["metric-system-detail.html<br/>Business theme detail"]
  MetricGenerate --> PublishResult["metric-publish-result.html<br/>Publish result"]
  PublishResult --> MetricTheme
  MetricTheme --> DirectionDetail["metric-direction-detail.html<br/>Direction detail"]
  DirectionDetail --> OutputAssetDetail["metric-output-asset-detail.html<br/>Output asset detail"]
```

## Route Groups

- Home: module-level overview and entry cards.
- Data Assets: source onboarding, source detail, asset detail, build task lifecycle, artifacts, changes, and database model graph.
- Data Metrics: metrics overview, problem-driven generation wizard, publish result, business theme detail, direction detail, and output asset detail.
