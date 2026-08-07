/**
 * Account Health & Churn Risk Deterministic Scoring Engine
 * 
 * Score Range: 0 - 100 Points
 * 
 * Category Weightings:
 * - Seat Utilization (Max 30 pts)
 * - Feature Adoption & Engagement (Max 25 pts)
 * - Support Health / P1 Tickets (Max 25 pts)
 * - NPS & Sentiment (Max 20 pts)
 * 
 * Routing Actions / Tiers:
 * - Health Score < 45: CHURN_RISK_ALERT (Immediate Slack alert + CS Risk Task)
 * - Health Score 45-74: STABLE_MONITOR (Dashboard sync)
 * - Health Score >= 75: EXPANSION_OPPORTUNITY (Slack Upsell Alert + Account Manager Sync)
 */

function calculateAccountHealth(enrichedPayload) {
  const { account, health_inputs } = enrichedPayload;
  
  let totalScore = 0;
  const breakdown = {
    seat_utilization_score: 0,
    engagement_adoption_score: 0,
    support_health_score: 0,
    nps_sentiment_score: 0,
    risk_factors: [],
    expansion_triggers: []
  };

  // 1. Seat Utilization Scoring (Max 30 Pts)
  const utilization = health_inputs.seat_utilization_pct;
  if (utilization >= 85) {
    breakdown.seat_utilization_score = 30;
    if (utilization >= 95) {
      breakdown.expansion_triggers.push('Seat capacity near limit (>=95% utilization)');
    }
  } else if (utilization >= 60) {
    breakdown.seat_utilization_score = 20;
  } else if (utilization >= 30) {
    breakdown.seat_utilization_score = 10;
    breakdown.risk_factors.push('Low seat utilization (30-59%)');
  } else {
    breakdown.seat_utilization_score = 0;
    breakdown.risk_factors.push('Critical under-utilization (<30% seats active)');
  }

  // 2. Feature Adoption & Weekly Engagement Scoring (Max 25 Pts)
  const adoption = health_inputs.feature_adoption_pct;
  const logins = health_inputs.weekly_login_avg;
  
  let engagementPts = 0;
  if (adoption >= 70) engagementPts += 15;
  else if (adoption >= 40) engagementPts += 8;
  else breakdown.risk_factors.push('Low feature adoption (<40%)');

  if (logins >= 5) engagementPts += 10;
  else if (logins >= 2) engagementPts += 5;
  else breakdown.risk_factors.push('Low weekly user login frequency (<2 logins/week)');

  breakdown.engagement_adoption_score = Math.min(25, engagementPts);

  // 3. Support Health & P1 Tickets Scoring (Max 25 Pts)
  const p1Tickets = health_inputs.p1_tickets_count;
  if (p1Tickets === 0) {
    breakdown.support_health_score = 25;
  } else if (p1Tickets === 1) {
    breakdown.support_health_score = 10;
    breakdown.risk_factors.push('1 open P1 critical support ticket');
  } else {
    breakdown.support_health_score = 0;
    breakdown.risk_factors.push(`Multiple open P1 tickets (${p1Tickets} active)`);
  }

  // 4. NPS & Sentiment Scoring (Max 20 Pts)
  const nps = health_inputs.nps;
  if (nps !== null && nps !== undefined) {
    if (nps >= 9) {
      breakdown.nps_sentiment_score = 20;
      breakdown.expansion_triggers.push(`High NPS promoter score (${nps})`);
    } else if (nps >= 7) {
      breakdown.nps_sentiment_score = 12;
    } else {
      breakdown.nps_sentiment_score = 0;
      breakdown.risk_factors.push(`Detractor NPS score (${nps})`);
    }
  } else {
    breakdown.nps_sentiment_score = 10; // Neutral fallback if NPS uncollected
  }

  // Final Aggregation
  totalScore = 
    breakdown.seat_utilization_score +
    breakdown.engagement_adoption_score +
    breakdown.support_health_score +
    breakdown.nps_sentiment_score;

  // Contract Renewal Window Gating Modifier
  if (account.days_until_renewal <= 60 && totalScore < 50) {
    breakdown.risk_factors.push(`Renewal approaching in ${account.days_until_renewal} days with low health score`);
  }

  // Tier Assignment
  let tier = '';
  let routing_action = '';

  if (totalScore < 45) {
    tier = 'HIGH_CHURN_RISK';
    routing_action = 'ROUTE_TO_SLACK_RISK_ALERT_AND_CS_TASK';
  } else if (totalScore >= 75 && breakdown.expansion_triggers.length > 0) {
    tier = 'EXPANSION_OPPORTUNITY';
    routing_action = 'ROUTE_TO_SLACK_UPSELL_ALERT_AND_AM_SYNC';
  } else {
    tier = 'STABLE_MONITOR';
    routing_action = 'SYNC_TO_CS_DASHBOARD';
  }

  return {
    account_id: account.account_id,
    account_name: account.account_name,
    health_score: totalScore,
    tier: tier,
    routing_action: routing_action,
    scoring_breakdown: breakdown
  };
}

module.exports = { calculateAccountHealth };
