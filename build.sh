#!/bin/sh 

SERVICES = "trpc tasks jobs metrics"

for service in $SERVICES; do
  docker build --target trpc -t @rhiva-ag_$service:latest .
done


docker stack deploy -c docker-compose.yml rhiva-ag 
