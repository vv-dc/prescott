#!/bin/sh

DIR="$(dirname $0)"

COMPOSE_FILE="$DIR/docker-compose.yml"
PROJECT_DIR="$DIR/../" 

docker-compose -f $COMPOSE_FILE --project-directory $PROJECT_DIR down
docker-compose -f $COMPOSE_FILE --project-directory $PROJECT_DIR up
