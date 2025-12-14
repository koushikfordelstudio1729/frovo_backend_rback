# 🔧 Inventory Management Fixes - Complete Guide

## 🔴 Critical Bugs Fixed

### Bug 1: Wrong Warehouse Reference in Inventory Creation
**Problem:** Inventory was using Purchase Order ID instead of Warehouse ID
```typescript
// ❌ BEFORE (Lines 591, 606)
warehouse: new Types.ObjectId(purchaseOrderId) // Wrong!
```

**Fix:** Now uses correct Warehouse ID from Purchase Order
```typescript
// ✅ AFTER
warehouse: warehouseId // From PO.warehouse field
```

---

### Bug 2: Missing Warehouse Field in Purchase Order Model
**Problem:** Purchase Orders didn't track which warehouse they belong to

**Fix:** Added warehouse field to:
- `IRaisePurchaseOrder` interface
- `raisePurchaseOrderSchema`
- `RaisePurchaseOrderData` interface

---

### Bug 3: No Auto-Detection for Warehouse Managers
**Problem:** Warehouse managers had to manually specify warehouse ID

**Fix:** Added auto-detection logic:
- If warehouse ID provided → use it
- If warehouse manager → auto-detect their assigned warehouse
- If super admin → warehouse ID required

---

## 📁 Files Modified

### 1. **src/models/Warehouse.model.ts**
- Added `warehouse: Types.ObjectId` to `IRaisePurchaseOrder` interface (line 131)
- Added `warehouse` field to schema (lines 191-195)

### 2. **src/validators/warehouse.validator.ts**
- Added optional `warehouse` field to `createPurchaseOrderSchema` (line 22)

### 3. **src/services/warehouse.service.ts**
- Added `warehouse` field to `RaisePurchaseOrderData` interface (line 81)
- Updated `createPurchaseOrder()` to accept `userRoles` parameter (line 456)
- Added warehouse auto-detection logic (lines 472-497)
- Fixed inventory creation to use correct warehouse ID (lines 615-660)

### 4. **src/controllers/warehouse.controller.ts**
- Updated PO creation to pass user roles to service (line 59)
- Added warehouse to response logging (line 63)

---

## 🚀 How It Works Now

### **For Warehouse Managers:**

1. **Create Purchase Order** (warehouse auto-detected):
```bash
POST /api/warehouse/inbound/purchase-orders
{
  "vendor": "vendor_id",
  "po_line_items": [...]
  // No warehouse field needed!
}
```

The system will:
1. ✅ Detect user is warehouse manager
2. ✅ Find their assigned warehouse
3. ✅ Auto-assign warehouse to PO
4. ✅ When GRN created → inventory goes to correct warehouse

### **For Super Admin:**

```bash
POST /api/warehouse/inbound/purchase-orders
{
  "vendor": "vendor_id",
  "warehouse": "warehouse_id", // Must specify warehouse
  "po_line_items": [...]
}
```

---

## 🔄 GRN → Inventory Flow

**When creating GRN:**

1. Fetch Purchase Order
2. Check if PO has `warehouse` field
3. If YES → Create/Update inventory in that warehouse
4. If NO → Skip inventory creation with warning

**Console Output:**
```
📦 Adding inventory from GRN to warehouse: 6939c8730a7957edc3cd6bfa
  ✅ Created inventory for LAY-CLASSIC-25G: 500 units
  ✅ Updated inventory for LAY-MASALA-25G: +300 units
```

---

## ⚠️ Migration Required

### For Existing Purchase Orders

**Option 1: Manual Update** (Small dataset)
```bash
PUT /api/warehouse/inbound/purchase-orders/:poId
{
  "warehouse": "warehouse_id"
}
```

**Option 2: Run Migration Script** (Recommended)
```bash
node migrate-po-warehouses.js
```

See `migrate-po-warehouses.js` for automated migration.

---

## 🧪 Testing Steps

### 1. Restart Server
```bash
npm run dev
```

### 2. Test as Warehouse Manager

**Step 1: Login as warehouse manager**
```bash
POST /api/auth/login
{
  "email": "john.warehouse@example.com",
  "password": "SecurePass123"
}
```

**Step 2: Create Purchase Order (no warehouse field)**
```bash
POST /api/warehouse/inbound/purchase-orders
{
  "vendor": "{{vendorId}}",
  "po_line_items": [
    {
      "line_no": 1,
      "sku": "LAY-CLASSIC-25G",
      "productName": "Lays Classic 25g",
      "quantity": 500,
      "category": "Snacks",
      "pack_size": "25g",
      "uom": "Pack",
      "unit_price": 10,
      "expected_delivery_date": "2025-12-15T10:00:00Z",
      "location": "Zone A"
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "po_number": "PO12345678",
    "warehouse": "6939c8730a7957edc3cd6bfa", // ✅ Auto-assigned!
    "vendor": {...},
    "po_line_items": [...]
  }
}
```

**Step 3: Create GRN**
```bash
POST /api/warehouse/purchase-orders/{{poId}}/grn
{
  "delivery_challan": "DC-12345",
  "transporter_name": "ABC Transport",
  "vehicle_number": "MH-01-1234",
  "qc_status": "excellent"
}
```

**Step 4: Check Inventory**
```bash
GET /api/warehouse/inventory/dashboard/6939c8730a7957edc3cd6bfa
```

**Expected:** Inventory created with correct warehouse ID!

---

## 📊 Debug Logs

Watch for these logs:

**PO Creation:**
```
📦 Received PO data:
   vendor: 675...
   warehouse: Not provided
🏢 Auto-detected warehouse for manager: WH-MUM-002
✅ PO created with vendor details and warehouse stored in document
```

**GRN Creation:**
```
📦 Creating GRN for PO: 675...
✅ GRN created successfully: DC-12345
📦 Adding inventory from GRN to warehouse: 6939c8730a7957edc3cd6bfa
  ✅ Created inventory for LAY-CLASSIC-25G: 500 units
```

---

## ✅ Summary

| Issue | Status | Impact |
|-------|--------|--------|
| Wrong warehouse reference | ✅ Fixed | Inventory now goes to correct warehouse |
| Missing warehouse field in PO | ✅ Fixed | POs now track their warehouse |
| No auto-detection | ✅ Fixed | Warehouse managers don't need to specify warehouse |
| Inventory not created | ✅ Fixed | GRN automatically creates inventory |

---

## 🆘 Troubleshooting

### Issue: "Purchase order does not have warehouse assigned"

**Cause:** Old PO without warehouse field

**Solution:** Update PO with warehouse ID or create new PO

### Issue: Inventory still not created

**Check:**
1. PO has `warehouse` field
2. Server logs show "Adding inventory from GRN to warehouse"
3. No error logs

### Issue: Warehouse not auto-detected

**Check:**
1. User has `warehouse_manager` system role
2. User is assigned as manager to a warehouse
3. Warehouse is active (`isActive: true`)

---

**Last Updated:** 2025-12-11
**Version:** 2.0.0
