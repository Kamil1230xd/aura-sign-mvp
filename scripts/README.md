# scripts/

This directory contains convenience scripts to bootstrap the AURA-IDTOKEN local environment.

## bootstrap-aura-idtoken.sh

Make the script executable:

chmod +x scripts/bootstrap-aura-idtoken.sh

Run it:

./scripts/bootstrap-aura-idtoken.sh

The script uses `docker compose` (v2). It expects a .env file in the repository root. Optional .env variables:

- HEALTH_HTTP_URLS: comma-separated HTTP endpoints to check for liveness/ready (e.g. "http://api:3000/health")
- KAFKA_BROKERS: comma-separated host:port pairs to TCP-check Kafka brokers (e.g. "kafka:9092")

## systemd

An example systemd unit is provided at scripts/systemd/aura-bootstrap.service. Adjust `WorkingDirectory` and `ExecStart` before enabling.

## Supervisor

A Supervisor config example is provided at scripts/supervisor/aura-bootstrap.conf. Adjust paths and user values before using.
