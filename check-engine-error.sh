#!/bin/bash
echo "=== CONTAINER STATUS ==="
docker ps -a | grep arb-engine

echo ""
echo "=== CONTAINER INSPECT ==="
docker inspect arb-engine --format='State: {{.State.Status}}'
docker inspect arb-engine --format='Error: {{.State.Error}}'
docker inspect arb-engine --format='ExitCode: {{.State.ExitCode}}'
docker inspect arb-engine --format='RestartCount: {{.State.RestartCount}}'

echo ""
echo "=== LAST 100 LOG LINES ==="
docker logs arb-engine --tail=100 2>&1

echo ""
echo "=== VOLUME MOUNTS ==="
docker inspect arb-engine --format='{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Mode}}){{"\n"}}{{end}}'

echo ""
echo "=== ENVIRONMENT VARIABLES (Sanitized) ==="
docker inspect arb-engine --format='{{range .Config.Env}}{{println .}}{{end}}' | grep -E "NODE_ENV|PORT|DATABASE_URL|REDIS_URL" | sed 's/=.*/=***/'
