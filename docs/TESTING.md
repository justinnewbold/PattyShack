# PattyShack Testing Roadmap

## Next Recommended Test: Temperature Monitoring Workflow

This scenario validates the new in-memory temperature monitoring service, ensuring that readings are captured, evaluated against thresholds, and surfaced through the API with accurate analytics.

### Objectives
- Confirm that new readings can be logged via `POST /api/v1/temperatures`.
- Validate automatic threshold enforcement and alert generation for out-of-range readings.
- Ensure aggregated statistics and trends are reported correctly across the temperature endpoints.

### Prerequisites
- PattyShack API server running locally (`npm start`) or via the dev script (`npm run dev`).
- API client such as cURL, Postman, or HTTPie.
- Sample equipment identifiers and types (e.g., `FRIDGE-01`, `freezer`).

### Test Steps
1. **Log an in-range reading**
   - Request: `POST /api/v1/temperatures`
   - Body:
     ```json
     {
       "locationId": "LOC-001",
       "equipmentId": "FRIDGE-01",
       "equipmentType": "fridge",
       "temperature": 38,
       "source": "manual"
     }
     ```
   - Expected: `201` response with `isInRange: true` and a stored threshold for the equipment type.

2. **Log an out-of-range reading**
   - Request: `POST /api/v1/temperatures`
   - Body:
     ```json
     {
       "locationId": "LOC-001",
       "equipmentId": "FRIDGE-01",
       "equipmentType": "fridge",
       "temperature": 50,
       "source": "iot_sensor"
     }
     ```
   - Expected: `201` response with `isInRange: false` and an alert created for the equipment.

3. **Retrieve temperature logs**
   - Request: `GET /api/v1/temperatures?locationId=LOC-001`
   - Expected: Response includes both readings, statistics showing `totalReadings: 2`, `outOfRange: 1`, and the average temperature of `44`.

4. **Review alert queue**
   - Request: `GET /api/v1/temperatures/alerts?locationId=LOC-001`
   - Expected: Alert summary showing one active alert for `FRIDGE-01`.

5. **Inspect equipment history**
   - Request: `GET /api/v1/temperatures/equipment/FRIDGE-01?period=24h`
   - Expected: Trend data with latest reading equal to the out-of-range entry and `min`/`max` reflecting both logged values.

### Success Criteria
- All responses return `success: true` and match the expected payload structures.
- Out-of-range readings consistently generate alerts with accurate direction (`high` or `low`).
- Statistics and trend calculations align with the logged data set.

### Follow-Up Enhancements
- Add alert acknowledgement and resolution endpoints.
- Persist temperature logs to a database instead of in-memory storage.
- Expand automated test coverage for the temperature service and routes.
