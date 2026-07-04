# Endpoint mapping từ backend Node.js sang backend Python

Các prefix đang được dựng trong FastAPI:

## Auth `/api/auth`
- `POST /register`
- `POST /create-admin`
- `POST /login`
- `GET /profile`

## Donor `/api/donor`
- `POST /check-location`
- `POST /check-appointment`
- `POST /send-otp`
- `POST /verify-otp`
- `POST /health-declaration`
- `GET /profile`
- `PUT /profile`
- `GET /stats`
- `GET /history`
- `GET /test-results`
- `GET /reminders`
- `GET /certificate/{donationId}`
- `GET /urgent-requests`
- `GET /camps`
- `POST /appointments`
- `GET /appointments`
- `PUT /appointments/{id}/cancel`
- `POST /upload-id-card`
- `POST /verify-id-card`
- `GET /public/test-results/{email}`
- `POST /invite`

## Admin `/api/admin`
- `GET /seed`
- `GET /profile`
- `PUT /profile`
- `PUT /change-password`
- `GET /dashboard`
- `GET /manage`
- `POST /manage`
- `PUT /manage/{id}`
- `DELETE /manage/{id}`
- `GET /donors`
- `POST /donors`
- `GET /donor/{id}`
- `PUT /donor/{id}`
- `DELETE /donor/{id}`
- `GET /facilities`
- `POST /facilities`
- `PUT /facility/{id}`
- `PUT /facility/approve/{id}`
- `PUT /facility/reject/{id}`
- `DELETE /facility/{id}`
- `GET /blood-requests`
- `POST /blood-requests`
- `PUT /blood-requests/{id}`
- `DELETE /blood-requests/{id}`
- `PUT /blood-requests/{id}/approve`
- `PUT /blood-requests/{id}/reject`
- `GET /blood-stock`
- `GET /blood-stock/units`
- `POST /blood-stock/add`
- `PUT /blood-stock/{id}`
- `DELETE /blood-stock/{id}`
- `GET /camps`
- `POST /camps`
- `PUT /camps/{id}`
- `PUT /camps/{id}/status`
- `DELETE /camps/{id}`
- `GET /audit-logs`
- `GET /reports`
- `POST /notifications/broadcast`
- `GET /notifications/history`
- `POST /backup`
- `GET /backups/list`

## Facility `/api/facility`
- `GET /dashboard`
- `GET /profile`
- `PUT /profile`
- `GET /labs`

## Blood Lab `/api/blood-lab`
- `GET /dashboard`
- `GET /history`
- `GET /staff`
- `POST /staff`
- `PATCH /staff/{id}`
- `GET /blood/stock`
- `GET /blood/units`
- `POST /blood/units/batch`
- `POST /blood/units`
- `GET /blood/units/barcode/{barcode}`
- `GET /blood/units/{id}/code`
- `POST /blood/units/{id}/components`
- `PATCH /blood/units/issue`
- `PATCH /blood/units/{id}/screening`
- `PATCH /blood/units/{id}/import`
- `PATCH /blood/units/{id}/discard`
- `PATCH /blood/batches/{batchCode}/screening`
- `POST /blood/batches/{batchCode}/screening/import-csv`
- `PATCH /blood/batches/{batchCode}/import`
- `GET /blood/requests`
- `PUT /blood/requests/{id}`
- `PATCH /blood/requests/{id}/handover`
- `GET /donor/search`
- `POST /donor/donate/{id}`
- `GET /donors/search`
- `POST /donors/donate/{id}`
- `GET /donations/recent`
- `GET /labs`

## Hospital `/api/hospital`
- `GET /blood/needs`
- `POST /blood/request`
- `GET /blood/requests`
- `PATCH /blood/requests/{id}/confirm`
- `GET /dashboard`
- `GET /blood/stock`
- `GET /history`
- `GET /donors`
- `POST /donors/{id}/contact`

## Donation Staff `/api/donation-staff`
- `GET /queue`
- `POST /call`
- `PUT /start/{appointmentId}`
- `PUT /complete/{appointmentId}`
- `PUT /defer/{appointmentId}`

## Lab Staff `/api/lab-staff`
- `GET /me`
- `GET /worklist`
- `PUT /results/{bloodUnitId}/draft`
- `POST /results/{id}/submit`
- `POST /results/{id}/approve`

## Staff `/api/staff`
- `POST /login`
- `GET /sessions`
- `GET /queue/{sessionId}`
- `GET /stats`
- `POST /queue/add`
- `POST /queue/call/{sessionId}`
- `POST /donation/start`
- `POST /donation/complete`
