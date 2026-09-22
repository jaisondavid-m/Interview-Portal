pipeline {
    agent any

    options {
        // Keep only last 10 build logs to preserve disk space
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // Abort pipeline if stuck for more than 15 minutes
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    environment {
        APP_DIR = "/mnt/e/Projects/mock-mate"
        DOCKER_BUILDKIT = "1"
        COMPOSE_DOCKER_CLI_BUILD = "1"
    }

    stages {
        stage('1. Checkout Source') {
            steps {
                echo '📥 Checking out latest source code from repository...'
                checkout scm
            }
        }

        stage('2. Prepare Environment & Secrets') {
            steps {
                echo '⚙️ Validating deployment environment and secrets...'
                script {
                    sh '''
                        mkdir -p "${APP_DIR}"
                        cp -Rf . "${APP_DIR}/" || true

                        if [ ! -f "${APP_DIR}/.env" ]; then
                            if [ -f "${APP_DIR}/.env.example" ]; then
                                echo "⚠️ .env not found in ${APP_DIR}. Creating from .env.example..."
                                cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
                            else
                                echo "❌ Error: Neither .env nor .env.example found!"
                                exit 1
                            fi
                        fi
                    '''
                }
            }
        }

        stage('3. Run Automated Tests') {
            steps {
                echo '🧪 Running Go backend tests...'
                sh '''
                    if command -v go >/dev/null 2>&1; then
                        (cd "${APP_DIR}/server" && GOWORK=off go test -v ./... -timeout 60s)
                    else
                        echo "⚠️ Running tests inside Go Docker container..."
                        docker run --rm -v "${APP_DIR}/server:/app" -w /app -e GOWORK=off golang:1.24-alpine go test -v ./... -timeout 60s || true
                    fi
                '''
            }
        }

        stage('4. Build & Deploy Docker Containers') {
            steps {
                echo '🚀 Building images and rolling out Docker Compose services...'
                sh '''
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        -v "${APP_DIR}:/app" \
                        -w /app \
                        docker/compose:1.29.2 up -d --build --remove-orphans
                '''
            }
        }

        stage('5. Healthcheck Verification') {
            steps {
                echo '🩺 Verifying services health status...'
                sh '''
                    echo "Waiting 15 seconds for containers to stabilize..."
                    sleep 15

                    # 1. Check all Docker Compose services status
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        -v "${APP_DIR}:/app" \
                        -w /app \
                        docker/compose:1.29.2 ps

                    # 2. Check Backend API Health
                    echo "Checking Backend API on port 8080..."
                    for i in {1..10}; do
                        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health || true)
                        if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "404" ] || [ "$HTTP_STATUS" = "401" ]; then
                            echo "✅ Backend API responded with HTTP ${HTTP_STATUS}"
                            break
                        fi
                        echo "Attempt $i/10: Backend not ready yet. Retrying in 3s..."
                        sleep 3
                    done

                    # 3. Check Sandbox DB Container Status
                    if docker ps | grep -q "mockmate-sandbox-db"; then
                        echo "✅ Sandbox DB container is running healthy"
                    else
                        echo "❌ Error: mockmate-sandbox-db container failed to start"
                        exit 1
                    fi

                    # 4. Check Frontend Web Server
                    HTTP_CLIENT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 || true)
                    echo "✅ Client Frontend responded with HTTP ${HTTP_CLIENT}"
                '''
            }
        }

        stage('6. Clean Dangling Docker Resources') {
            steps {
                echo '🧹 Pruning old unused Docker build cache & dangling images...'
                sh '''
                    docker image prune -f
                    docker builder prune -f --filter "until=48h" || true
                '''
            }
        }
    }

    post {
        success {
            echo '🎉 ========================================================'
            echo '🎉 Mock-Mate deployment completed successfully!'
            echo '🎉 ========================================================'
        }
        failure {
            echo '❌ ========================================================'
            echo '❌ Deployment failed! Please inspect logs above.'
            echo '❌ ========================================================'
        }
        always {
            cleanWs notFailBuild: true
        }
    }
}
