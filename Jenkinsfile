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
        ADO_PIPELINE_ID = '5'
        ADO_BRANCH      = 'main'
        COMPOSER      = 'C:\\agent\\composer.bat'
        COMPOSER_PHAR = 'C:\\agent\\composer.phar'
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
                bat """
                    curl -s -X POST "https://dev.azure.com/SanthoshManickam/JenkinsToADOPipeline/_apis/pipelines/5/runs?api-version=7.1" -H "Content-Type: application/json" -H "Authorization: Basic OkUwRnd1cDI1SlgwaUtxMkkzc0d6Ym1wa0lOdmdZQVFVVWhXZGF6T2RqUzZNTkFTZE84aWVKUVFKOTlDREFDQUFBQUFnNmt6QUFBQVNBWkRPOVBzZQ==" -d "{\"resources\":{\"repositories\":{\"self\":{\"refName\":\"refs/heads/main\"}}}}"
                """
                echo 'ADO Pipeline triggered successfully!'
            }
        }
    }

    post {
        success { echo "Build #${env.BUILD_NUMBER} passed. ADO triggered!" }
        failure { echo "Build #${env.BUILD_NUMBER} failed." }
    }
}
