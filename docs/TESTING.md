# PattyShack Testing Roadmap

## Next Recommended Test: Invoice Capture and Approval Workflow

This scenario validates the in-memory invoice management service, ensuring that invoices can be captured, enriched with OCR data, routed through approval, and reconciled for payment while maintaining accurate analytics.

### Objectives
- Confirm that invoices can be captured via `POST /api/v1/invoices`.
- Validate OCR enrichment and approval workflow endpoints.
- Ensure aggregated summaries and aging analytics reflect invoice lifecycle updates.

### Prerequisites
- PattyShack API server running locally (`npm start`) or via the dev script (`npm run dev`).
- API client such as cURL, Postman, or HTTPie.
- Sample location and vendor identifiers (e.g., `store-100`, `vendor-501`).

### Test Steps
1. **Capture a new invoice**
   - Request: `POST /api/v1/invoices`
   - Body:
     ```json
     {
       "locationId": "store-100",
       "vendorId": "vendor-501",
       "invoiceNumber": "PS-TEST-001",
       "invoiceDate": "2024-02-01",
       "dueDate": "2024-02-15",
       "tax": 4.85,
       "lineItems": [
         { "description": "Ground Beef", "quantity": 20, "unitPrice": 3.5 },
         { "description": "Sesame Buns", "quantity": 12, "unitPrice": 12.25 }
       ]
     }
     ```
   - Expected: `201` response with calculated `subtotal` and `total`, and the invoice listed as `pending`.

2. **Enrich invoice with OCR data**
   - Request: `POST /api/v1/invoices/{id}/ocr`
   - Body:
     ```json
     {
       "ocrConfidence": 0.94,
       "notes": "OCR verified quantities",
       "lineItems": [
         { "description": "Ground Beef", "quantity": 20, "unitPrice": 3.5 },
         { "description": "Sesame Buns", "quantity": 12, "unitPrice": 12.25 }
       ]
     }
     ```
   - Expected: Response reflects `ocrProcessed: true`, stores the confidence value, and recalculates totals if items changed.

3. **Approve the invoice**
   - Request: `POST /api/v1/invoices/{id}/approve`
   - Body:
     ```json
     {
       "userId": "manager-100",
       "notes": "Approved for payment"
     }
     ```
   - Expected: Invoice status transitions to `approved` with `approvedBy` and `approvedAt` populated.

4. **Reconcile the invoice**
   - Request: `POST /api/v1/invoices/{id}/reconcile`
   - Body:
     ```json
     {
       "reconciledWith": "PO-TEST-001",
       "paymentMethod": "ach",
       "paidAt": "2024-02-10",
       "notes": "Matched PO quantities"
     }
     ```
   - Expected: Invoice is marked `reconciled`, `paidAt` is stored, and status defaults to `paid` if not provided.

5. **Review invoice analytics**
   - Request: `GET /api/v1/invoices/{id}`
   - Expected: `analytics` block indicates `lineItemCount`, `isOverdue: false`, and `outstandingBalance: 0` after payment.

6. **Verify dashboard summary**
   - Request: `GET /api/v1/invoices?locationId=store-100`
   - Expected: `summary` reflects updated counts and `aging` buckets show zero balance for the reconciled invoice.

### Success Criteria
- All responses return `success: true` and match the expected payload structures.
- Invoice totals update after OCR enrichment and reconciliation steps.
- Summary and aging analytics reflect the current status of the invoice lifecycle.

### Follow-Up Enhancements
- Add vendor performance analytics and accrual reporting.
- Persist invoice data to a database instead of in-memory storage.
- Expand automated test coverage for the invoice service and routes.
