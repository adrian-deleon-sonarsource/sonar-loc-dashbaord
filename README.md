# SonarQube LOC Dashboard

An interactive Lines-of-Code history dashboard for SonarQube:

- **SonarQube Plugin (JAR)** — embedded directly in SonarQube as a page extension

---

## Features

- LOC over time (stacked area chart across all projects)
- By Language breakdown with drill-down — click any language name or bar to see which projects contribute
- By Project comparison with Top-N selector (default 20) and aggregated "Others" bar
- Language and project filters with All / None toggles
- Date range selector
- Comparison dropdown with live search — select any subset of projects
- Project drill-down — click a project bar to see its full LOC history and growth summary
- Scales gracefully to 400+ projects via Top-N limits, search filters, and "Others" aggregation

---

## Install

### Requirements

- Java 11+
- Maven 3.6+
- SonarQube 9.x / 10.x / 2025.x / 2026.x (tested on 10.6, 2025.1.7, 2026.2.1)

### Build

```bash
cd sonarqube-loc-dashboard
mvn clean package
# JAR is at target/sonar-locdashboard-plugin-1.0.0.jar
```

### Deploy

**Windows/Linux(Docker):**
```bash
docker cp <JAR_file> <DOCKER_CONTAINER_NAME>:/opt/sonarqube/extensions/plugins/sonar-locdashboard-plugin-1.0.0.jar
docker restart <DOCKER_CONTAINER_NAME>

```


Build the JAR, copy it into the running SonarQube container, and restart it.

Wait ~30 seconds after restart, then hard-refresh (`Ctrl+Shift+R`) the browser.

The dashboard appears under **More > LOC Dashboard** in the SonarQube top nav.

> **Note:** A hard refresh (`Ctrl+Shift+R`) isn't always required, but it's helpful in deleting cached assets.

---



## Project Structure

```
sonarqube-loc-dashboard/
  src/main/java/com/locdashboard/
    LocDashboardPlugin.java        Plugin entry point
    DashboardPageDefinition.java   Page registration
  src/main/resources/static/
    index.js                       Dashboard UI (all logic, no framework)
    chart.umd.min.js               Chart.js (bundled, no CDN)
    chartjs-adapter-date-fns.bundle.min.js
  pom.xml


```

---

## SonarQube Version Notes

| Version | Notable additions |
|---|---|
| 10.6 | Baseline — Java, JS/TS, Python, C/C++, Go, C#, etc. |
| 2025.1+ | Ansible, Dart added |
| 2026.x | GitHub Actions, Shell (IaC), Rust, Groovy, PowerShell beta |

JSON and OpenAPI YAML files are **not** counted as LOC in any version — the IaC JSON sensor only targets CloudFormation/ARM templates, and there is no OpenAPI sensor.

---

## Development

The entire dashboard UI lives in a single file: `src/main/resources/static/index.js`.
It uses the SonarQube `window.registerExtension` IIFE pattern with no build step.

