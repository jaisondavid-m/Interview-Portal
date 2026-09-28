pipeline {
    agent any

    parameters {
        choice(name: 'ACTION', choices: ['deploy', 'rollback'], description: 'Select deployment rollout or instant rollback')
        string(name: 'RELEASE_TAG', defaultValue: '', description: 'Optional custom release tag (e.g. v2.1.0). If blank, auto-generates timestamp release tag.')
        booleanParam(name: 'RUN_TESTS', defaultValue: true, description: 'Run automated backend unit tests prior to deployment')
    }

    triggers {
        // Poll SCM every 2 minutes for new git commits
        pollSCM('H/2 * * * *')
        githubPush()
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    environment {
        PROJECT_DIR = "/home/ssg-admin/projects/Mock-Mate"
        DOCKER_BUILDKIT = "1"
        COMPOSE_DOCKER_CLI_BUILD = "1"
    }

    stages {
        stage('1. Synchronize Source') {
            steps {
                echo '📥 Synchronizing codebase with repository...'
                sh '''
                    cd "${PROJECT_DIR}"
                    git fetch origin main || true
                    git reset --hard origin/main || true
                    echo "Latest Commit: $(git log -1 --oneline)"
                    chmod +x deploy.sh rollback.sh
                '''
            }
        }

        stage('2. Prepare Environment') {
            steps {
                echo '⚙️ Validating environment and configurations...'
                sh '''
                    cd "${PROJECT_DIR}"
                    if [ ! -f .env ]; then
                        if [ -f .env.example ]; then
                            echo "⚠️ .env not found. Creating from .env.example..."
                            cp .env.example .env
                        fi
                    fi
                    grep -q "BLUE_PORT" .env || echo "BLUE_PORT=8083" >> .env
                    grep -q "GREEN_PORT" .env || echo "GREEN_PORT=8084" >> .env
                '''
            }
        }

        stage('3. Run Automated Tests') {
            when {
                expression { return params.ACTION == 'deploy' && params.RUN_TESTS }
            }
            steps {
                echo '🧪 Running Go backend unit tests in isolated container...'
                sh '''
                    docker run --rm \
                        -v "${PROJECT_DIR}/server:/app" \
                        -w /app \
                        -e GOWORK=off \
                        golang:1.24-alpine \
                        go test -mod=mod -v ./... -timeout 60s
                '''
            }
        }

        stage('4. Execute Blue-Green Rollout') {
            steps {
                script {
                    if (params.ACTION == 'rollback') {
                        echo '⏪ Executing Instant Rollback...'
                        sh '''
                            cd "${PROJECT_DIR}"
                            ./rollback.sh
                        '''
                    } else {
                        echo '🚀 Executing Blue-Green Zero-Downtime Deployment...'
                        def tag = params.RELEASE_TAG?.trim() ?: "RELEASE_${env.BUILD_NUMBER}_$(date +%Y%m%d_%H%M%S)"
                        sh """
                            cd "${PROJECT_DIR}"
                            ./deploy.sh "${tag}"
                        """
                    }
                }
            }
        }

        stage('5. Verify Ingress & Telemetry') {
            steps {
                echo '🩺 Verifying production gateway & health probes...'
                sh '''
                    cd "${PROJECT_DIR}"
                    if [ -f .env ]; then
                        set -a
                        source .env
                        set +a
                    fi
                    PROD_PORT="${CLIENT_PORT:-8081}"

                    echo "Checking production gateway on port ${PROD_PORT}..."
                    VERSION_RESP=$(curl -sf "http://127.0.0.1:${PROD_PORT}/version" || echo "{}")
                    echo "Version Check Response: ${VERSION_RESP}"

                    echo "Checking backend database health..."
                    curl -sf "http://127.0.0.1:${PROD_PORT}/health" | grep -q "success" || {
                        echo "❌ Health check response missing 'success'!"
                        exit 1
                    }

                    ACTIVE_COLOR="unknown"
                    if [ -f .active_deployment ]; then
                        ACTIVE_COLOR=$(cat .active_deployment)
                    fi
                    echo "✅ Live Production traffic actively served by: [${ACTIVE_COLOR^^}]"
                '''
            }
        }

        stage('6. Docker Hygiene') {
            steps {
                echo '🧹 Pruning old dangling Docker images...'
                sh '''
                    docker image prune -f --filter "until=72h" || true
                '''
            }
        }
    }

    post {
        success {
            echo '🎉 ========================================================'
            echo "🎉 Build #${BUILD_NUMBER}: Mock-Mate Blue-Green deployment completed successfully!"
            echo '🎉 ========================================================'
        }
        failure {
            echo '❌ ========================================================'
            echo "❌ Build #${BUILD_NUMBER} FAILED! Triggering automatic rollback safeguard..."
            echo '❌ ========================================================'
            sh '''
                cd "${PROJECT_DIR}"
                if [ "${ACTION}" = "deploy" ]; then
                    echo "Initiating emergency rollback..."
                    ./rollback.sh || true
                fi
            '''
        }
    }
}
