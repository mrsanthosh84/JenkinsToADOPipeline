pipeline {
    agent any

    environment {
        ADO_ORG         = 'SanthoshManickam'
        ADO_PROJECT     = 'JenkinsToADOPipeline'
        ADO_PIPELINE_ID = '1'
        ADO_BRANCH      = 'main'
        PHP_PATH        = 'C:\\php\\php.exe'
        COMPOSER_PATH   = 'C:\\Users\\v-samanickam\\AppData\\Local\\ComposerSetup\\bin\\composer.bat'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Test') {
            parallel {
                stage('PHP - Laravel') {
                    stages {
                        stage('PHP Install') {
                            steps {
                                dir('php') {
                                    bat '"C:\\Users\\v-samanickam\\AppData\\Local\\ComposerSetup\\bin\\composer.bat" install --no-interaction --prefer-dist --optimize-autoloader'
                                    bat 'copy .env.example .env'
                                    bat '"C:\\php\\php.exe" artisan key:generate'
                                }
                            }
                        }
                        stage('PHP Test') {
                            steps {
                                dir('php') {
                                    bat '"C:\\php\\php.exe" vendor\\bin\\phpunit --configuration phpunit.xml'
                                }
                            }
                        }
                    }
                }

                stage('Node.js') {
                    stages {
                        stage('Node Install') {
                            steps {
                                dir('Nodejs') {
                                    bat '"C:\\Program Files\\nodejs\\npm.cmd" ci'
                                }
                            }
                        }
                        stage('Node Test') {
                            steps {
                                dir('Nodejs') {
                                    bat '"C:\\Program Files\\nodejs\\npm.cmd" test'
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Trigger ADO Pipeline') {
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
                echo "ADO Pipeline triggered successfully!"
            }
        }
    }

    post {
        success {
            echo "Build #${env.BUILD_NUMBER} passed. ADO pipeline triggered!"
        }
        failure {
            echo "Build #${env.BUILD_NUMBER} failed. ADO pipeline not triggered."
        }
        always {
            cleanWs()
        }
    }
}
