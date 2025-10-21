# PattyShack Testing Roadmap

## Next Recommended Test: Analytics Dashboard & Alerting Validation

This scenario validates the new analytics aggregation service, ensuring that operational KPIs, benchmarking, and alerting are all
surfaced correctly through the analytics API layer.

### Objectives
- Confirm that the analytics dashboard returns calculated KPIs, charts, and compliance metrics for a selected location.
- Validate that multi-location benchmarking ranks stores and reports average performance for a chosen metric.
- Ensure that generated reports include contextual metadata, summaries, and supporting breakdowns for the requested period.
- Verify that cross-domain alerts consolidate temperature, inventory, task, and invoice signals with severity summaries.

### Prerequisites
- PattyShack API server running locally (`npm start`) or via the dev script (`npm run dev`).
- API client such as cURL, Postman, or HTTPie.
- Sample location identifiers from seeded data (e.g., `store-100`, `store-200`).

### Test Steps
1. **Load the analytics dashboard**
   - Request: `GET /api/v1/analytics/dashboard?locationId=store-100&period=7d`
   - Expected: Response includes `success: true` and `data.kpis` populated with `sales`, `foodCost`, `laborCost`, `waste`, and
     `compliance` metrics. `charts.salesTrend` should include at least one entry with `sales` and `laborCost` values.

2. **Compare locations for a sales benchmark**
   - Request: `GET /api/v1/analytics/locations?metric=sales&period=30d`
   - Expected: Response lists locations sorted by sales with `rank`, `value`, and `change` fields. `benchmark.average` should
     represent the mean sales value for the returned locations.

3. **Generate an operations report**
   - Request: `GET /api/v1/analytics/reports/operations?locationId=store-100&startDate=2024-01-01&endDate=2024-02-01`
   - Expected: Response contains `data.compliance`, `data.alerts`, and `data.taskBreakdown` blocks with totals aligned to the
     filtered range. `alerts.summary` should aggregate counts by severity.

4. **Generate a financial report**
   - Request: `GET /api/v1/analytics/reports/financial?locationId=store-100&period=30d`
   - Expected: Response includes `data.totals.totalSpend`, `data.byStatus`, and `data.aging` reflecting invoices in range with
     outstanding balances consolidated.

5. **Review cross-domain alerts**
   - Request: `GET /api/v1/analytics/alerts?locationId=store-100`
   - Expected: Response returns a merged alert list containing temperature, inventory, task, and invoice signals. `summary` should
     enumerate counts for `critical`, `warning`, and `info` severities.

### Success Criteria
- Every analytics endpoint responds with `success: true` and includes the expected aggregation structures.
- KPI values reflect the seeded in-memory data (non-zero sales, labor cost, and waste totals for demo locations).
- Report payloads provide contextual metadata (filters, generated timestamps) and structured breakdowns.
- Alert payloads include actionable metadata such as `equipmentId`, `itemId`, or `vendorId` where applicable.

### Follow-Up Enhancements
- Add CSV/PDF export endpoints for analytics reports.
- Persist aggregated metrics for historical comparisons and trend analysis.
- Integrate predictive models for anomaly detection beyond static thresholding.
