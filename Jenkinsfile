pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timeout(time: 15, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '5'))
    }

    environment {
        ADO_ORG         = 'SanthoshManickam'
        ADO_PROJECT     = 'JenkinsToADOPipeline'
        ADO_PIPELINE_ID = '2'
        ADO_BRANCH      = 'main'
        COMPOSER        = 'C:\\Users\\v-samanickam\\AppData\\Local\\ComposerSetup\\bin\\composer.bat'
        PHP             = 'C:\\php\\php.exe'
        NPM             = 'C:\\Program Files\\nodejs\\npm.cmd'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout([$class: 'GitSCM',
                    branches: [[name: '*/main']],
                    extensions: [[$class: 'CloneOption', shallow: true, depth: 1]],
                    userRemoteConfigs: scm.userRemoteConfigs
                ])
            }
        }

        stage('Build & Test') {
            parallel {
                stage('PHP') {
                    steps {
                        dir('php') {
                            bat """
                                if not exist vendor (
                                    "${COMPOSER}" install --no-interaction --no-dev --prefer-dist --optimize-autoloader --no-scripts
                                )
                                if not exist .env copy .env.example .env
                                "${PHP}" artisan key:generate --force
                                "${PHP}" vendor\\bin\\phpunit --configuration phpunit.xml --no-coverage
                            """
                        }
                    }
                }

                stage('Node.js') {
                    steps {
                        dir('Nodejs') {
                            bat """
                                if not exist node_modules (
                                    "${NPM}" ci --prefer-offline
                                )
                                "${NPM}" test -- --forceExit --no-coverage --testTimeout=5000
                            """
                        }
                    }
                }
            }
        }

        stage('Trigger ADO') {
            steps {
                withCredentials([string(credentialsId: 'ado-pat', variable: 'ADO_PAT')]) {
                    script {
                        def encodedPat = "Basic " + Base64.encoder.encodeToString(":${ADO_PAT}".bytes)
                        httpRequest(
                            httpMode: 'POST',
                            url: "https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis/pipelines/${ADO_PIPELINE_ID}/runs?api-version=7.1",
                            contentType: 'APPLICATION_JSON',
                            requestBody: """{"resources": {"repositories": {"self": {"refName": "refs/heads/${ADO_BRANCH}"}}}}""",
                            customHeaders: [[name: 'Authorization', value: encodedPat]],
                            validResponseCodes: '200:299'
                        )
                    }
                }
                echo "ADO Pipeline triggered!"
            }
        }
    }

    post {
        success { echo "Build #${env.BUILD_NUMBER} passed. ADO triggered!" }
        failure { echo "Build #${env.BUILD_NUMBER} failed." }
        always  { cleanWs() }
    }
}
