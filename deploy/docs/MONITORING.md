# ============================================

# Monitoring & Alerting Guide

# ============================================

# Prometheus + Grafana Setup

## Prometheus Configuration

### prometheus.yml

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  # Prometheus self-monitoring
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  # Node Exporter (Server Metrics)
  - job_name: "node"
    static_configs:
      - targets: ["node-exporter:9100"]

  # cAdvisor (Container Metrics)
  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]

  # Backend Application
  - job_name: "backend"
    static_configs:
      - targets: ["backend:3000"]
    metrics_path: /metrics

  # Blackbox Exporter (Health Checks)
  - job_name: "blackbox"
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://admin-pro.com/api/health
          - https://admin-pro.com
```

## Grafana Dashboards

### Dashboard 1: System Overview

```json
{
  "title": "System Overview",
  "panels": [
    {
      "title": "CPU Usage",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(node_cpu_seconds_total[5m]) * 100",
          "legendFormat": "{{instance}}"
        }
      ]
    },
    {
      "title": "Memory Usage",
      "type": "graph",
      "targets": [
        {
          "expr": "node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100",
          "legendFormat": "{{instance}}"
        }
      ]
    },
    {
      "title": "Network I/O",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(node_network_receive_bytes_total[5m])",
          "legendFormat": "RX {{instance}}"
        },
        {
          "expr": "rate(node_network_transmit_bytes_total[5m])",
          "legendFormat": "TX {{instance}}"
        }
      ]
    }
  ]
}
```

### Dashboard 2: Application Performance

```json
{
  "title": "Application Performance",
  "panels": [
    {
      "title": "Request Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(http_requests_total[5m])",
          "legendFormat": "{{method}} {{path}}"
        }
      ]
    },
    {
      "title": "Response Time (p95)",
      "type": "graph",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
          "legendFormat": "p95 {{path}}"
        }
      ]
    },
    {
      "title": "Error Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
          "legendFormat": "5xx errors"
        }
      ]
    }
  ]
}
```

## Alert Rules

### alert-rules.yml

```yaml
groups:
  - name: container_alerts
    interval: 30s
    rules:
      - alert: HighCPUUsage
        expr: rate(container_cpu_usage_seconds_total{name=~"backend|frontend"}[5m]) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "{{$labels.name}} CPU usage is above 80%"

      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_memory_limit_bytes > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "{{$labels.name}} memory usage is above 85%"

      - alert: ContainerDown
        expr: up{job=~"backend|frontend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Container is down"
          description: "{{$labels.job}} has been down for more than 1 minute"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5%"

  - name: infrastructure_alerts
    interval: 30s
    rules:
      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space"
          description: "Disk space on {{$labels.instance}} is below 20%"

      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"
          description: "Redis has been down for more than 1 minute"
```

## Setup Instructions

### 1. Create monitoring namespace

```bash
kubectl create namespace monitoring
```

### 2. Deploy Prometheus

```bash
helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --set alertmanager.enabled=true \
  --set server.persistentVolume.enabled=true \
  --set server.persistentVolume.size=10Gi
```

### 3. Deploy Grafana

```bash
helm install grafana grafana \
  --namespace monitoring \
  --set adminPassword=<ADMIN_PASSWORD> \
  --set persistence.enabled=true \
  --set persistence.size=5Gi
```

### 4. Access services

```bash
# Prometheus
kubectl port-forward -n monitoring prometheus-server 9090:9090

# Grafana
kubectl port-forward -n monitoring grafana 3000:3000
```

## Key Metrics to Monitor

### Infrastructure

- CPU usage per container
- Memory usage per container
- Disk I/O and space
- Network throughput

### Application

- Request rate per endpoint
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Active connections

### Business

- User logins per hour
- Task creation rate
- API usage by client
