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
                writeFile file: 'ado_payload.json', text: '{"resources":{"repositories":{"self":{"refName":"refs/heads/main"}}}}'
                bat 'curl -s -w "\\nHTTP_STATUS:%%{http_code}" -X POST "https://dev.azure.com/SanthoshManickam/JenkinsToADOPipeline/_apis/pipelines/5/runs?api-version=7.1" -H "Content-Type: application/json" -H "Authorization: Basic OkUwRnd1cDI1SlgwaUtxMkkzc0d6Ym1wa0lOdmdZQVFVVWhXZGF6T2RqUzZNTkFTZE84aWVKUVFKOTlDREFDQUFBQUFnNmt6QUFBQVNBWkRPOVBzZQ==" -d @ado_payload.json'
                echo 'ADO Pipeline triggered successfully!'
            }
        }
    }

    post {
        success { echo "Build #${env.BUILD_NUMBER} passed. ADO triggered!" }
        failure { echo "Build #${env.BUILD_NUMBER} failed." }
    }
}
