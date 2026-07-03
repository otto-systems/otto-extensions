# Otto Metrics Module

This module provides typed metrics for Otto extensions with MemPalace persistence.

## Features

- Counters
- Gauges
- Histograms
- Timers
- Module-level metrics
- Kernel-level metrics
- Extension-level metrics
- Update metrics
- Command-service metrics
- MemPalace persistence for metric schema, events, and decisions

## MemPalace Files

Runtime writes use mempalace/metrics:

- metric-schema.json
- metric-events.jsonl
- metric-decisions.jsonl
