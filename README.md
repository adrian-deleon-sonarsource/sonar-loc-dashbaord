# SonarQube LOC Dashboard

An interactive Lines-of-Code history dashboard for SonarQube. Available in two forms:

- **SonarQube Plugin (JAR)** — embedded directly in SonarQube as a page extension
- **Standalone HTML + Node.js proxy** — runs outside SonarQube, useful for read-only access or demos

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

## Option 1: SonarQube Plugin

### Requirements

- Java 11+
- Maven 3.6+
- SonarQube 9.x / 10.x / 2025.x / 2026.x (tested on 10.6, 2025.1.7, 2026.2.1)
- Docker (for the deploy scripts)

### Build

```bash
cd sonarqube-loc-dashboard
mvn clean package
# JAR is at target/sonar-locdashboard-plugin-1.0.0.jar
```

### Deploy

**Windows (Docker):**
```bat
cd sonarqube-loc-dashboard
deploy.bat
```

**Linux/macOS (Docker):**
```bash
cd sonarqube-loc-dashboard
./deploy.sh
```

Both scripts build the JAR, copy it into the running SonarQube container, and restart it.
Default container name is `sonarqube` — edit the script to change it.

Wait ~30 seconds after restart, then hard-refresh (`Ctrl+Shift+R`) the browser.

The dashboard appears under **More > LOC Dashboard** in the SonarQube top nav.

> **Note:** A hard refresh (`Ctrl+Shift+R`) is required after every deploy — SonarQube aggressively caches plugin static assets.

---

## Option 2: Standalone HTML + Node.js Proxy

No npm dependencies required — runs on the Node.js built-in `http` module.

### Requirements

- Node.js 14+
- A running SonarQube instance (local or remote)

### Start

```bash
node server.js
# Open http://localhost:3000
```

Optional flags:

| Flag / Env | Description |
|---|---|
| `PORT=8080 node server.js` | Change port (default 3000) |
| `node server.js --insecure` | Disable TLS certificate verification |

The dashboard will prompt for your SonarQube URL and a user token. The token only needs **Browse** permission on the projects you want to view.

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
    locdashboard/
      index.html                   Local standalone testing only (not used by JAR)
  pom.xml
  deploy.bat                       Windows Docker deploy
  deploy.sh                        Linux/macOS Docker deploy

server.js                          Node.js CORS proxy (standalone mode)
sonarqube-dashboard.html           Standalone dashboard HTML
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

After editing `index.js`, run `deploy.bat` / `deploy.sh` and hard-refresh the browser.
