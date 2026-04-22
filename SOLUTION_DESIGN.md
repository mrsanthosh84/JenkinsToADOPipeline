# Solution Design Document
## Jenkins to Azure DevOps (ADO) Pipeline Integration
**Project:** JenkinsToADOPipeline
**Author:** Santhosh Manickam
**Date:** April 2026
**Version:** 1.0

---

## 1. Executive Summary

This document describes the design and implementation of a CI/CD pipeline integration
between Jenkins and Azure DevOps (ADO). The solution builds and tests a PHP Laravel
application and a Node.js application in Jenkins, then automatically triggers an ADO
pipeline via REST API upon successful completion. The ADO pipeline runs the same tests
on a self-hosted agent and publishes test results.

---

## 2. Architecture Overview

```
+------------------+       Git Push        +------------------+
|   Developer      | --------------------> |   GitHub Repo    |
|   Local Machine  |                       | mrsanthosh84/    |
|                  |                       | JenkinsToADO     |
+------------------+                       +--------+---------+
                                                    |
                                          Webhook / Manual
                                                    |
                                                    v
+---------------------------------------------------+----------+
|                    JENKINS SERVER                            |
|                  http://localhost:8080                       |
|                                                              |
|  Stage 1: Checkout (shallow clone depth=1)                   |
|  Stage 2: Build & Test (Parallel)                            |
|    +---------------------------+---------------------------+ |
|    |   PHP Laravel             |   Node.js                 | |
|    |  - key:generate           |  - npm ci                 | |
|    |  - PHPUnit (2 tests) ✅   |  - Jest (1 test) ✅       | |
|    +---------------------------+---------------------------+ |
|  Stage 3: Trigger ADO Pipeline via REST API                  |
|    - curl POST to ADO API                                    |
|    - Logs Jenkins Build #                                    |
|    - Logs ADO Build Number                                   |
|    - Logs ADO Run ID                                         |
|    - Logs ADO Pipeline URL                                   |
+--------------------------------------------------------------+
                              |
                    ADO REST API Call
                    POST /pipelines/5/runs
                              |
                              v
+---------------------------------------------------+----------+
|              AZURE DEVOPS PIPELINE                           |
|    https://dev.azure.com/SanthoshManickam/                   |
|    JenkinsToADOPipeline                                      |
|                                                              |
|  Stage: Build & Test (Parallel Jobs)                         |
|    +---------------------------+---------------------------+ |
|    |   PHP Laravel Job         |   Node.js Job             | |
|    |  Pool: LocalAgent         |  Pool: LocalAgent         | |
|    |  - Cache Composer         |  - Cache npm              | |
|    |  - Composer Install       |  - npm ci                 | |
|    |  - key:generate           |  - Jest Tests ✅          | |
|    |  - PHPUnit Tests ✅       |  - Publish Results        | |
|    |  - Publish Results        |                           | |
|    +---------------------------+---------------------------+ |
+--------------------------------------------------------------+
                              |
                              v
+--------------------------------------------------------------+
|              SELF-HOSTED AGENT (LocalAgent)                  |
|              Machine: SANTHOSH                               |
|              Agent: vstsagent.SanthoshManickam               |
|              Status: Online ✅                               |
+--------------------------------------------------------------+
```

---

## 3. Technology Stack

| Component        | Technology          | Version    | Location                          |
|------------------|---------------------|------------|-----------------------------------|
| CI Server        | Jenkins             | Latest     | http://localhost:8080             |
| CD Platform      | Azure DevOps        | Cloud      | dev.azure.com/SanthoshManickam   |
| PHP Framework    | Laravel             | 13.x       | /php folder                       |
| PHP Runtime      | PHP                 | 8.5.5      | C:\php\php.exe                    |
| PHP Testing      | PHPUnit             | 12.5.20    | vendor/bin/phpunit                |
| Node.js Runtime  | Node.js             | 18.x       | C:\Program Files\nodejs           |
| Node.js Framework| Express             | 4.18.2     | Nodejs/index.js                   |
| Node.js Testing  | Jest + Supertest    | 29.x       | Nodejs/index.test.js              |
| Source Control   | GitHub              | -          | github.com/mrsanthosh84           |
| ADO Agent        | Self-Hosted         | 4.271.0    | C:\agent                          |
| Java             | OpenJDK             | 21.0.10    | C:\Program Files\Microsoft\jdk-21 |

---

## 4. Repository Structure

```
JenkinsToADOPipeline/
│
├── php/                          # Laravel PHP Application
│   ├── app/                      # Application logic
│   ├── bootstrap/                # Laravel bootstrap files
│   ├── config/                   # Configuration files
│   ├── database/                 # Migrations and seeders
│   ├── public/                   # Web root
│   ├── resources/                # Views, CSS, JS
│   ├── routes/                   # Route definitions
│   ├── storage/                  # Logs and cache
│   ├── tests/
│   │   ├── Feature/              # Feature tests
│   │   └── Unit/                 # Unit tests
│   ├── vendor/                   # Composer dependencies
│   ├── .env.example              # Environment template
│   ├── artisan                   # Laravel CLI
│   ├── composer.json             # PHP dependencies
│   └── phpunit.xml               # PHPUnit configuration
│
├── Nodejs/                       # Node.js Express Application
│   ├── index.js                  # Express app (no server binding)
│   ├── server.js                 # Server entry point
│   ├── index.test.js             # Jest test for /health endpoint
│   ├── package.json              # Node dependencies
│   └── .env.example              # Environment template
│
├── Jenkinsfile                   # Jenkins pipeline definition
├── azure-pipelines.yml           # ADO pipeline definition
├── .gitignore                    # Git ignore rules
└── README.md                     # Project documentation
```

---

## 5. Jenkins Pipeline Design

### 5.1 Pipeline Configuration

| Setting              | Value                                      |
|----------------------|--------------------------------------------|
| Job Name             | JenkinsToADOPipeline                       |
| Pipeline Type        | Pipeline script from SCM                   |
| SCM                  | Git                                        |
| Repository URL       | https://github.com/mrsanthosh84/JenkinsToADOPipeline.git |
| Branch               | */main                                     |
| Script Path          | Jenkinsfile                                |
| Timeout              | 15 minutes                                 |
| Build Retention      | Last 5 builds                              |

### 5.2 Pipeline Stages

```
[Checkout] --> [Build & Test (Parallel)] --> [Trigger ADO]
                    |           |
                  [PHP]      [Node.js]
```

#### Stage 1 — Checkout
- Shallow clone with depth=1 for speed
- Pulls latest code from GitHub main branch

#### Stage 2 — Build & Test (Parallel)

**PHP Laravel:**
```groovy
dir('php') {
    bat """
        if not exist .env copy .env.example .env
        "C:\php\php.exe" artisan key:generate --force
        "C:\php\php.exe" vendor\bin\phpunit --configuration phpunit.xml --no-coverage
    """
}
```
- Copies .env from template
- Generates Laravel application key
- Runs PHPUnit tests (2 tests, 2 assertions)

**Node.js:**
```groovy
dir('Nodejs') {
    bat """
        if not exist node_modules (
            "C:\Program Files\nodejs\npm.cmd" ci --prefer-offline
        )
        "C:\Program Files\nodejs\npm.cmd" test -- --forceExit --no-coverage
    """
}
```
- Installs npm packages if not cached
- Runs Jest tests (1 test suite, 1 test)

#### Stage 3 — Trigger ADO Pipeline
```groovy
writeFile file: 'ado_payload.json',
    text: '{"resources":{"repositories":{"self":{"refName":"refs/heads/main"}}}}'

def response = bat(
    script: 'curl -s -X POST "https://dev.azure.com/..." -d @ado_payload.json',
    returnStdout: true
).trim()

echo "Jenkins  Build   : #${env.BUILD_NUMBER}"
echo "ADO Build Number : ${buildNum}"
echo "ADO Run ID       : ${runId}"
echo "ADO Pipeline URL : https://dev.azure.com/.../results?buildId=${runId}"
```

### 5.3 Jenkins Console Output Sample

```
============================================
Jenkins  Build   : #22
ADO Build Number : 20260422.16
ADO Run ID       : 40
ADO Pipeline URL : https://dev.azure.com/SanthoshManickam/JenkinsToADOPipeline/_build/results?buildId=40
============================================
Jenkins #22 passed. ADO pipeline triggered!
Finished: SUCCESS
```

---

## 6. Azure DevOps Pipeline Design

### 6.1 Pipeline Configuration

| Setting              | Value                                      |
|----------------------|--------------------------------------------|
| Organization         | SanthoshManickam                           |
| Project              | JenkinsToADOPipeline                       |
| Pipeline Name        | mrsanthosh84.JenkinsToADOPipeline          |
| Pipeline ID          | 5                                          |
| YAML File            | azure-pipelines.yml                        |
| Agent Pool           | LocalAgent (Self-Hosted)                   |
| Agent Name           | SANTHOSH                                   |
| Agent Version        | 4.271.0                                    |
| Trigger              | Jenkins REST API + CI on main/develop      |

### 6.2 Pipeline Jobs

```
Stage: Build_Test
    |
    +-- Job: PHP_Laravel (LocalAgent)
    |       - Checkout (fetchDepth: 1)
    |       - Cache Composer packages
    |       - Composer Install (if cache miss)
    |       - Laravel Setup (key:generate)
    |       - Run PHPUnit Tests
    |       - Publish Test Results (JUnit)
    |
    +-- Job: NodeJS (LocalAgent)
            - Checkout (fetchDepth: 1)
            - Cache npm packages
            - npm ci (if cache miss)
            - Run Jest Tests
            - Publish Test Results (JUnit)
```

### 6.3 Self-Hosted Agent Details

| Property         | Value                                              |
|------------------|----------------------------------------------------|
| Agent Pool       | LocalAgent                                         |
| Agent Name       | SANTHOSH                                           |
| Machine          | Windows (SANTHOSH)                                 |
| Service Name     | vstsagent.SanthoshManickam.LocalAgent.SANTHOSH     |
| Service Status   | Running                                            |
| Agent Status     | Online                                             |
| Install Path     | C:\agent                                           |

---

## 7. ADO REST API Integration

### 7.1 API Call Details

| Property         | Value                                                                    |
|------------------|--------------------------------------------------------------------------|
| Method           | POST                                                                     |
| URL              | https://dev.azure.com/SanthoshManickam/JenkinsToADOPipeline/_apis/pipelines/5/runs?api-version=7.1 |
| Auth Type        | Basic Authentication                                                     |
| Auth Header      | Authorization: Basic <Base64(:PAT)>                                      |
| Content-Type     | application/json                                                         |
| Payload File     | ado_payload.json                                                         |

### 7.2 Request Payload

```json
{
  "resources": {
    "repositories": {
      "self": {
        "refName": "refs/heads/main"
      }
    }
  }
}
```

### 7.3 Response Sample

```json
{
  "id": 40,
  "name": "20260422.16",
  "state": "inProgress",
  "createdDate": "2026-04-22T02:22:29Z",
  "_links": {
    "web": {
      "href": "https://dev.azure.com/SanthoshManickam/.../_build/results?buildId=40"
    }
  }
}
```

---

## 8. Application Details

### 8.1 PHP Laravel Application

| Property         | Value                          |
|------------------|--------------------------------|
| Framework        | Laravel 13.x                   |
| PHP Version      | 8.5.5                          |
| Test Framework   | PHPUnit 12.5.20                |
| Test Count       | 2 tests, 2 assertions          |
| DB Connection    | SQLite (in-memory for tests)   |
| Key Feature      | No database required locally   |

**phpunit.xml configuration:**
```xml
<env name="APP_ENV" value="testing"/>
<env name="DB_CONNECTION" value="sqlite"/>
<env name="DB_DATABASE" value=":memory:"/>
```

### 8.2 Node.js Application

| Property         | Value                          |
|------------------|--------------------------------|
| Framework        | Express 4.18.2                 |
| Node Version     | 18.x                           |
| Test Framework   | Jest 29.x + Supertest          |
| Test Count       | 1 test suite, 1 test           |
| Endpoint         | GET /health → {status: "ok"}   |

**Health endpoint:**
```javascript
app.get('/health', (req, res) => res.json({ status: 'ok' }));
```

**Test:**
```javascript
it('should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
});
```

---

## 9. Environment Setup

### 9.1 Local Machine Setup

| Tool             | Version    | Path                                                    |
|------------------|------------|---------------------------------------------------------|
| PHP              | 8.5.5      | C:\php\php.exe                                          |
| Composer         | 2.x        | C:\Users\v-samanickam\AppData\Local\ComposerSetup\bin   |
| Node.js          | 18.x       | C:\Program Files\nodejs                                 |
| npm              | 9.x        | C:\Program Files\nodejs\npm.cmd                         |
| Java             | 21.0.10    | C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot        |
| Git              | 2.53.0     | C:\Program Files\Git                                    |
| Jenkins          | Latest     | C:\ProgramData\Jenkins\.jenkins                         |
| ADO Agent        | 4.271.0    | C:\agent                                                |

### 9.2 PHP Extensions Enabled (php.ini)

```ini
extension=curl
extension=fileinfo
extension=mbstring
extension=openssl
extension=pdo_mysql
extension=pdo_sqlite
extension=zip          ; Critical for fast Composer downloads
extension_dir = "ext"
```

### 9.3 Environment Variables (.bashrc)

```bash
export JAVA_HOME="/c/Program Files/Microsoft/jdk-21.0.10.7-hotspot"
export PATH="$JAVA_HOME/bin:/c/php:/c/Users/v-samanickam/AppData/Local/ComposerSetup/bin:/c/Program Files/nodejs:$PATH"
```

---

## 10. Security

| Item                  | Implementation                                      |
|-----------------------|-----------------------------------------------------|
| ADO Authentication    | Personal Access Token (PAT) with Base64 encoding    |
| PAT Scope             | Build: Read & Execute, Code: Read                   |
| PAT Storage           | Encoded in Jenkinsfile (recommend Jenkins Credentials for production) |
| Jenkins Auth          | Username/Password (admin)                           |
| CSRF Protection       | Jenkins Crumb token for REST API calls              |
| Agent Account         | NT AUTHORITY\NETWORK SERVICE                        |

---

## 11. Build Flow — End to End

```
Step 1:  Developer clicks "Build Now" in Jenkins
         OR REST API call: POST http://localhost:8080/job/JenkinsToADOPipeline/build

Step 2:  Jenkins pulls code from GitHub (shallow clone)
         Commit: main branch

Step 3:  Jenkins runs PHP and Node.js in PARALLEL
         PHP  → key:generate → PHPUnit → 2 tests PASS ✅
         Node → npm ci       → Jest    → 1 test  PASS ✅

Step 4:  Jenkins writes ado_payload.json
         Jenkins calls ADO REST API via curl

Step 5:  Jenkins logs:
         ============================================
         Jenkins  Build   : #22
         ADO Build Number : 20260422.16
         ADO Run ID       : 40
         ADO Pipeline URL : https://dev.azure.com/.../results?buildId=40
         ============================================

Step 6:  ADO pipeline starts immediately on LocalAgent (SANTHOSH)
         PHP  → Composer Install (cached) → PHPUnit → PASS ✅
         Node → npm ci (cached)           → Jest    → PASS ✅

Step 7:  ADO publishes test results to pipeline dashboard
         Total time: ~3-4 minutes end to end
```

---

## 12. Performance Optimisations

| Optimisation              | Jenkins | ADO  | Benefit                    |
|---------------------------|---------|------|----------------------------|
| Shallow clone (depth=1)   | ✅      | ✅   | Faster git checkout        |
| Vendor folder cached      | ✅      | ✅   | Skip composer install      |
| node_modules cached       | ✅      | ✅   | Skip npm install           |
| PHP zip extension enabled | ✅      | ✅   | Fast composer zip download |
| No coverage report        | ✅      | ✅   | Faster test execution      |
| Parallel jobs             | ✅      | ✅   | PHP + Node run together    |
| Build retention (5 max)   | ✅      | -    | Saves disk space           |

**Expected Build Times:**

| Stage                    | Time     |
|--------------------------|----------|
| Jenkins Checkout         | ~10s     |
| PHP Tests                | ~15s     |
| Node.js Tests            | ~5s      |
| ADO Trigger              | ~3s      |
| Jenkins Total            | ~35s     |
| ADO PHP + Node Tests     | ~2 mins  |
| Full End-to-End          | ~3 mins  |

---

## 13. Troubleshooting Guide

| Issue                              | Cause                              | Fix                                      |
|------------------------------------|------------------------------------|------------------------------------------|
| composer not found                 | PATH not set                       | Add ComposerSetup\bin to PATH            |
| php not found                      | PATH not set                       | Add C:\php to PATH                       |
| vendor/autoload.php missing        | Composer not run                   | Pre-install vendor in workspace          |
| composer zip extension missing     | php.ini not configured             | Enable extension=zip in php.ini          |
| Jest test timeout                  | Server not closing                 | Use app without server.listen in tests   |
| ADO JsonReaderException            | JSON escaping in Windows cmd       | Write JSON to file, use -d @file         |
| Jenkins sandbox rejected           | Groovy security restriction        | Use bat curl instead of httpRequest      |
| ADO No hosted parallelism          | Free tier limitation               | Use self-hosted LocalAgent               |
| Agent Access denied                | NETWORK SERVICE permissions        | Grant icacls permissions to agent folder |
| Java old version showing           | Oracle Java in System PATH         | Remove Oracle javapath from System PATH  |

---

## 14. Screenshots Reference

> Note: The following sections describe where to find screenshots in the running system.

### 14.1 Jenkins Dashboard
```
URL: http://localhost:8080
Shows: JenkinsToADOPipeline job with blue ball (success)
```

### 14.2 Jenkins Pipeline Stages View
```
URL: http://localhost:8080/job/JenkinsToADOPipeline/lastBuild/
Shows: Checkout → Build & Test (PHP + Node.js parallel) → Trigger ADO
```

### 14.3 Jenkins Console Output
```
URL: http://localhost:8080/job/JenkinsToADOPipeline/lastBuild/console
Shows: PHPUnit OK (2 tests) + Jest PASS + ADO build number logged
```

### 14.4 ADO Pipeline Dashboard
```
URL: https://dev.azure.com/SanthoshManickam/JenkinsToADOPipeline/_build
Shows: List of pipeline runs triggered by Jenkins
```

### 14.5 ADO Pipeline Run Detail
```
URL: https://dev.azure.com/SanthoshManickam/JenkinsToADOPipeline/_build/results?buildId=40
Shows: PHP Laravel + Node.js parallel jobs both succeeded
```

### 14.6 ADO Test Results
```
URL: https://dev.azure.com/SanthoshManickam/JenkinsToADOPipeline/_build/results?buildId=40&view=ms.vss-test-web.build-test-results-tab
Shows: PHP Laravel Tests (2 passed) + Node.js Tests (1 passed)
```

### 14.7 ADO Agent Pool
```
URL: https://dev.azure.com/SanthoshManickam/_settings/agentpools
Shows: LocalAgent pool with SANTHOSH agent Online
```

---

## 15. Key URLs Reference

| Resource                  | URL                                                                          |
|---------------------------|------------------------------------------------------------------------------|
| Jenkins Dashboard         | http://localhost:8080                                                        |
| Jenkins Job               | http://localhost:8080/job/JenkinsToADOPipeline                               |
| Jenkins Last Build        | http://localhost:8080/job/JenkinsToADOPipeline/lastBuild/console             |
| ADO Project               | https://dev.azure.com/SanthoshManickam/JenkinsToADOPipeline                 |
| ADO Pipelines             | https://dev.azure.com/SanthoshManickam/JenkinsToADOPipeline/_build          |
| ADO Agent Pool            | https://dev.azure.com/SanthoshManickam/_settings/agentpools                 |
| GitHub Repository         | https://github.com/mrsanthosh84/JenkinsToADOPipeline                        |

---

## 16. Conclusion

The Jenkins to ADO pipeline integration has been successfully implemented with the
following outcomes:

- ✅ PHP Laravel application builds and tests pass in Jenkins
- ✅ Node.js application builds and tests pass in Jenkins
- ✅ Jenkins triggers ADO pipeline via REST API after successful build
- ✅ ADO pipeline runs on self-hosted LocalAgent (SANTHOSH)
- ✅ ADO pipeline builds and tests both applications
- ✅ Test results published in ADO dashboard
- ✅ Jenkins console logs ADO build number, run ID and direct URL
- ✅ Full end-to-end pipeline completes in ~3 minutes
