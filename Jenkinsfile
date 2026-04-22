pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timeout(time: 15, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '5'))
    }

    environment {
        PHP = 'C:\\php\\php.exe'
        NPM = 'C:\\Program Files\\nodejs\\npm.cmd'
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
                script {
                    writeFile file: 'ado_payload.json', text: '{"resources":{"repositories":{"self":{"refName":"refs/heads/main"}}}}'
                    def response = bat(
                        script: 'curl -s -X POST "https://dev.azure.com/SanthoshManickam/JenkinsToADOPipeline/_apis/pipelines/5/runs?api-version=7.1" -H "Content-Type: application/json" -H "Authorization: Basic OkUwRnd1cDI1SlgwaUtxMkkzc0d6Ym1wa0lOdmdZQVFVVWhXZGF6T2RqUzZNTkFTZE84aWVKUVFKOTlDREFDQUFBQUFnNmt6QUFBQVNBWkRPOVBzZQ==" -d @ado_payload.json',
                        returnStdout: true
                    ).trim()
                    echo "ADO Response: ${response}"
                    def runId     = (response =~ /"id"\s*:\s*(\d+)/)[0][1]
                    def buildNum  = (response =~ /"name"\s*:\s*"([^"]+)"/)[0][1]
                    echo "============================================"
                    echo "Jenkins  Build : #${env.BUILD_NUMBER}"
                    echo "ADO Build Number : ${buildNum}"
                    echo "ADO Run ID       : ${runId}"
                    echo "ADO Pipeline URL : https://dev.azure.com/SanthoshManickam/JenkinsToADOPipeline/_build/results?buildId=${runId}"
                    echo "============================================"
                }
            }
        }
    }

    post {
        success { echo "Jenkins #${env.BUILD_NUMBER} passed. ADO pipeline triggered!" }
        failure { echo "Jenkins #${env.BUILD_NUMBER} failed." }
    }
}
