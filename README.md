# Enterprise Customer Churn & Expansion Intelligence Engine

[![CI/CD Schema Guardrails Validation](https://img.shields.io/badge/CI%2FCD%20Schema%20Guardrails-passing-brightgreen?style=flat&logo=github)](https://github.com/derickturner-hub/enterprise-revops-churn-expansion-engine/actions)

> Real-time product telemetry ingestion, contract metadata aggregation, deterministic health scoring (0–100), automated churn threat alerts, and expansion signal routing.

---

## Executive Summary

Preventing customer churn and capitalizing on expansion opportunities requires continuous, automated monitoring of account telemetry. This engine ingests usage metrics, validates schema integrity, calculates a multi-factored account health score, and routes actionable notifications directly to Customer Success and Account Management teams.

| Core Pipeline Feature | Legacy Setup | Enterprise Agentic Pipeline |
| :--- | :--- | :--- |
| **Telemetry Ingestion** | Manual quarterly reviews | Real-time event validation via JSON Schema guardrails |
| **Health Scoring** | Subjective CSM ratings | Deterministic 0–100 matrix rules across 4 operational dimensions |
| **Churn Risk Alerts** | Post-cancellation reactive alerts | Proactive high-risk Slack alerts + CS priority tasking |
| **Expansion Signal** | Missed upsell indicators | Automated expansion routing on capacity/NPS thresholds |

---

## Architecture & Pipeline Flow

```mermaid
flowchart TD
    A[Telemetry Event Webhook] --> B{Validate Inbound Schema}
    
    %% Valid Path
    B -- Valid --> C[Contract & Telemetry Aggregator]
    C --> D[Calculate Utilization & Days to Renewal]
    D --> E{Validate Enriched Schema}
    
    E -- Valid --> F[Deterministic Health Scoring Engine]
    
    %% Routing Paths
    F --> G{Health Score & Signal Gating}
    G -- Score < 45 (High Risk) --> H[Instant Slack Risk Alert & CS Task Creation]
    G -- Score >= 75 + Signal (Expansion) --> I[Slack Upsell Alert & Account Manager Sync]
    G -- 45 <= Score < 75 (Stable) --> J[Sync to Customer Success Dashboard]

    %% Quarantine / DLQ
    B -- Invalid Payload --> K[Quarantine / DLQ Sink]
    E -- Invalid Enriched Data --> K

    style B fill:#ff9,stroke:#333,stroke-width:2px
    style E fill:#ff9,stroke:#333,stroke-width:2px
    style F fill:#9f9,stroke:#333,stroke-width:2px
    style H fill:#f88,stroke:#333,stroke-width:2px
    style I fill:#bbf,stroke:#333,stroke-width:2px
    style K fill:#f88,stroke:#333,stroke-width:2px
