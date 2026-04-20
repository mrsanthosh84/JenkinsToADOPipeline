pipeline {
    agent any

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
                                    sh 'composer install --no-interaction --prefer-dist --optimize-autoloader'
                                    sh 'cp .env.example .env && php artisan key:generate'
                                }
                            }
                        }
                        stage('PHP Test') {
                            steps {
                                dir('php') {
                                    sh 'vendor/bin/phpunit --configuration phpunit.xml'
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
                                    sh 'npm ci'
                                }
                            }
                        }
                        stage('Node Test') {
                            steps {
                                dir('Nodejs') {
                                    sh 'npm test'
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline completed successfully. Build #${env.BUILD_NUMBER}"
        }
        failure {
            echo "Pipeline failed. Check logs for build #${env.BUILD_NUMBER}"
        }
        always {
            cleanWs()
        }
    }
}
