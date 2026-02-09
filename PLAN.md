# Vendor Verification Cleanup & Bulk Approval Plan

## Summary
Remove toggle-based verification, replace with direct-set verification endpoints, fix role permissions, add bulk approval for both companies and brands.

## Changes

### 1. Routes (`src/routes/vendor.routes.ts`)

**Remove:**
- `PATCH /companies/:id/toggle-status` (line 43-47) — toggle is unnecessary
- `PATCH /brands/:brand_id/toggle-verification` (line 111-114) — toggle is unnecessary
- `router.delete("/brands/:brand_id"...)` (line 181) — duplicate of line 118

**Add/Change:**
- `PATCH /companies/:id/verification` → `VENDOR_MANAGEMENT` roles — direct set company status with payload `{ company_status, risk_notes }`
- `PATCH /brands/:id/verification` → change from `STAFF_MANAGEMENT` to `VENDOR_MANAGEMENT` — only super_admin + vendor_admin can approve/reject
- `PATCH /companies/bulk-verification` → `VENDOR_MANAGEMENT` — bulk company status update
- `PATCH /brands/bulk-verification` → `VENDOR_MANAGEMENT` — bulk brand approval/rejection

### 2. Controller (`src/controllers/vendor.controller.ts`)

**Remove:**
- `toggleCompanyStatus` method (lines 932-1018)
- `toggleBrandVerificationStatus` method (lines 1622-1676)

**Add:**
- `updateCompanyVerificationStatus` — accepts `{ company_status, risk_notes }`, validates only "active"/"inactive"
- `bulkUpdateCompanyVerification` — accepts `{ company_ids: [...], company_status, risk_notes }`
- `bulkUpdateBrandVerification` — accepts `{ brand_ids: [...], verification_status, risk_notes }`

**Fix:**
- `updateBrandVerificationStatus` — add role check so only super_admin + vendor_admin can call it (not vendor_staff)

### 3. Service (`src/services/vendor.service.ts`)

**Remove:**
- `CompanyService.toggleCompanyStatus` method (lines 656-723)
- `BrandService.toggleBrandVerificationStatus` method (lines 2645-2739)

**Add:**
- `CompanyService.updateCompanyStatus` — direct set with payload + audit trail
- `CompanyService.bulkUpdateCompanyStatus` — update multiple companies + audit trail per company
- `BrandService.bulkUpdateBrandVerificationStatus` — update multiple brands + audit trail per brand

### 4. Postman Collection (`postman/vendor/FROVO Vendor Management.postman_collection.json`)

**Remove:**
- "Toggle Brand Verification" request from Vendor Verification folder

**Update:**
- Keep "Update Brand Verification Status" as the single brand verification endpoint
- Add "Update Company Status" to Company Management folder
- Add "Bulk Company Verification" to Vendor Verification folder
- Add "Bulk Brand Verification" to Vendor Verification folder

## Role Matrix (Final)

| Role | CRUD (companies + brands) | Approve/Reject |
|------|--------------------------|----------------|
| super_admin | Yes | Yes |
| vendor_admin | Yes | Yes |
| vendor_staff | Yes | **No** |
