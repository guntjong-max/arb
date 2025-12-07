#!/bin/bash
echo "🏥 Health Check"
curl -s http://localhost:3000/health | grep -q "healthy" && echo "✅ OK" || echo "❌ FAILED"
