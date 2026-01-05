# Warehouse Manager Access Control Guide

## Overview
This document explains how warehouse-scoped access control works in the Frovo backend system. Warehouse managers can only access and perform operations for their assigned warehouse.

---

## How It Works

### 1. **Warehouse Assignment**
When a Super Admin creates a warehouse, they assign a **Warehouse Manager** to it:

```json
POST /api/warehouse/warehouses
{
  "name": "Mumbai Central Warehouse",
  "code": "WH-MUM-007",
  "partner": "Frovo Distribution Partner",
  "location": "Andheri East, Mumbai, Maharashtra 400069",
  "capacity": 50000,
  "manager": "693a5917c20bfeb8a3c286e9"  // ← Warehouse Manager's User ID
}
```

### 2. **Automatic Warehouse Scoping**
When a warehouse manager logs in and makes API calls, the system automatically:
- ✅ Detects their role as `warehouse_manager`
- ✅ Finds their assigned warehouse
- ✅ Injects the warehouse ID into all requests
- ✅ Filters all data to show only their warehouse

---

## For Warehouse Managers

### Step 1: Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "dsfsdkoushi@gmai.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "693a5917c20bfeb8a3c286e9",
      "name": "sdsdfdsf koushik",
      "email": "dsfsdkoushi@gmai.com",
      "roles": [
        {
          "name": "Warehouse Manager Full",
          "key": "warehouse_manager_full"
        }
      ]
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

---

### Step 2: Get Your Assigned Warehouse
```http
GET /api/warehouse/warehouses/my-warehouse
Authorization: Bearer <your-access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "693af74a396431676d0b96bd",
    "name": "Mumbai Central Warehouse",
    "code": "WH-MUM-007",
    "partner": "Frovo Distribution Partner",
    "location": "Andheri East, Mumbai, Maharashtra 400069",
    "capacity": 50000,
    "manager": {
      "name": "sdsdfdsf koushik",
      "email": "dsfsdkoushi@gmai.com",
      "id": "693a5917c20bfeb8a3c286e9"
    },
    "isActive": true
  }
}
```

---

### Step 3: Access Warehouse Operations

All the following operations are **automatically scoped** to your assigned warehouse. You don't need to manually provide the `warehouseId` in most cases.

#### 📊 1. Dashboard
```http
GET /api/warehouse/dashboard
Authorization: Bearer <your-access-token>

# Automatically filtered to show only your warehouse data
```

---

#### 📦 2. Purchase Orders

**Create Purchase Order** (warehouse is auto-assigned):
```http
POST /api/warehouse/inbound/purchase-orders
Authorization: Bearer <your-access-token>
Content-Type: application/json

{
  "vendor": "693a4e2fc20bfeb8a3c28123",
  "po_raised_date": "2025-12-11T00:00:00Z",
  "po_status": "draft",
  "remarks": "Monthly procurement",
  "po_line_items": [
    {
      "line_no": 1,
      "sku": "SKU-001",
      "productName": "Product A",
      "quantity": 100,
      "category": "Vegetables",
      "pack_size": "1kg",
      "uom": "kg",
      "unit_price": 50,
      "expected_delivery_date": "2025-12-15T00:00:00Z",
      "location": "A-1-001"
    }
  ]
}
```

**Get Purchase Orders** (automatically filtered):
```http
GET /api/warehouse/inbound/purchase-orders
Authorization: Bearer <your-access-token>

# Returns only POs for your warehouse
```

---

#### 🚚 3. GRN (Goods Receipt Note)

**Create GRN**:
```http
POST /api/warehouse/purchase-orders/{purchaseOrderId}/grn
Authorization: Bearer <your-access-token>
Content-Type: application/json

{
  "delivery_challan": "DC-2025-001",
  "transporter_name": "ABC Transport",
  "vehicle_number": "MH12AB1234",
  "received_date": "2025-12-11T10:00:00Z",
  "qc_status": "excellent",
  "remarks": "All items received in good condition",
  "quantities": [
    {
      "sku": "SKU-001",
      "received_quantity": 100,
      "accepted_quantity": 98,
      "rejected_quantity": 2,
      "expiry_date": "2026-12-11T00:00:00Z",
      "item_remarks": "2 units damaged"
    }
  ]
}
```

**Get GRNs** (automatically filtered):
```http
GET /api/warehouse/grn
Authorization: Bearer <your-access-token>
```

---

#### 📤 4. Dispatch Orders

**Create Dispatch**:
```http
POST /api/warehouse/outbound/dispatch
Authorization: Bearer <your-access-token>
Content-Type: application/json

{
  "dispatchId": "DISP-2025-001",
  "destination": "Store A, Mumbai",
  "products": [
    {
      "sku": "SKU-001",
      "quantity": 50
    }
  ],
  "assignedAgent": "693a5824c20bfeb8a3c28291",
  "notes": "Urgent delivery"
}
```

**Get Dispatches** (automatically filtered):
```http
GET /api/warehouse/outbound/dispatches
Authorization: Bearer <your-access-token>
```

---

#### 📋 5. Inventory Management

**Get Inventory Dashboard**:
```http
GET /api/warehouse/inventory/dashboard/{warehouseId}
Authorization: Bearer <your-access-token>

# Use your assigned warehouse ID
# Example: GET /api/warehouse/inventory/dashboard/693af74a396431676d0b96bd
```

**Get Inventory Stats**:
```http
GET /api/warehouse/inventory/stats/{warehouseId}
Authorization: Bearer <your-access-token>
```

**Update Inventory Item**:
```http
PUT /api/warehouse/inventory/{inventoryId}
Authorization: Bearer <your-access-token>
Content-Type: application/json

{
  "quantity": 150,
  "minStockLevel": 20,
  "maxStockLevel": 500
}
```

---

#### 💰 6. Expense Management

**Create Expense**:
```http
POST /api/warehouse/expenses
Authorization: Bearer <your-access-token>
Content-Type: application/json

{
  "type": "utilities",
  "amount": 5000,
  "description": "Electricity bill for December",
  "category": "operational",
  "expenseDate": "2025-12-11T00:00:00Z"
}
```

**Get Expenses** (automatically filtered):
```http
GET /api/warehouse/expenses
Authorization: Bearer <your-access-token>
```

---

#### 📊 7. Reports & Analytics

**Generate Inventory Summary Report**:
```http
GET /api/warehouse/reports/inventory-summary?warehouseId={yourWarehouseId}
Authorization: Bearer <your-access-token>
```

**Generate Purchase Order Report**:
```http
GET /api/warehouse/reports/purchase-orders?warehouseId={yourWarehouseId}
Authorization: Bearer <your-access-token>
```

**Get Monthly Expense Trend**:
```http
GET /api/warehouse/expenses/trend/monthly?warehouseId={yourWarehouseId}&months=12
Authorization: Bearer <your-access-token>
```

---

## Access Control Rules

### ✅ What Warehouse Managers CAN Do:
1. View and manage **their assigned warehouse** operations
2. Create, view, and update Purchase Orders for their warehouse
3. Create and manage GRNs for their warehouse
4. Create and manage Dispatch Orders for their warehouse
5. View and manage Inventory for their warehouse
6. Create and manage Expenses for their warehouse
7. View Reports & Analytics for their warehouse
8. Manage QC Templates
9. Manage Field Agents
10. Manage Returns

### ❌ What Warehouse Managers CANNOT Do:
1. View or access other warehouses' data
2. Create new warehouses (Super Admin only)
3. Delete warehouses (Super Admin only)
4. Assign or change warehouse managers
5. Access cross-warehouse reports

---

## Security Features

### 1. **Automatic Warehouse Injection**
The `warehouseScopeMiddleware` automatically:
- Detects if the user is a warehouse manager
- Finds their assigned warehouse
- Injects the warehouse ID into all requests
- Prevents access to other warehouses

### 2. **Warehouse Access Validation**
The `validateWarehouseAccess` middleware:
- Validates that warehouse managers can only access their assigned warehouse
- Returns 403 error if they try to access another warehouse
- Provides clear error messages with the manager's assigned warehouse details

### 3. **Role-Based Filtering**
All service methods check:
- User's role (warehouse_manager, super_admin, etc.)
- Warehouse assignment
- Data isolation between warehouses

---

## Error Responses

### No Warehouse Assigned
```json
{
  "success": false,
  "message": "No warehouse assigned to your account. Please contact the administrator.",
  "timestamp": "2025-12-11T06:00:00.000Z"
}
```

### Access Denied
```json
{
  "success": false,
  "message": "Access denied: You can only access your assigned warehouse.",
  "data": {
    "yourWarehouse": {
      "id": "693af74a396431676d0b96bd",
      "name": "Mumbai Central Warehouse",
      "code": "WH-MUM-007"
    }
  },
  "timestamp": "2025-12-11T06:00:00.000Z"
}
```

---

## Frontend Integration

### Recommended Flow

1. **On Login:**
   ```javascript
   // After successful login
   const response = await fetch('/api/warehouse/warehouses/my-warehouse', {
     headers: {
       'Authorization': `Bearer ${accessToken}`
     }
   });
   const { data: warehouse } = await response.json();

   // Store warehouse in state/context
   setAssignedWarehouse(warehouse);
   ```

2. **For All Operations:**
   ```javascript
   // The middleware automatically handles warehouse filtering
   // Just make normal API calls without worrying about warehouseId

   // Example: Get Dashboard
   const dashboard = await fetch('/api/warehouse/dashboard', {
     headers: {
       'Authorization': `Bearer ${accessToken}`
     }
   });

   // Example: Create Purchase Order
   const po = await fetch('/api/warehouse/inbound/purchase-orders', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${accessToken}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       vendor: vendorId,
       po_line_items: [...]
       // warehouse is auto-assigned by middleware
     })
   });
   ```

3. **For Warehouse-Specific Routes:**
   ```javascript
   // Use the stored warehouse ID for routes that require it in the path
   const inventory = await fetch(
     `/api/warehouse/inventory/dashboard/${assignedWarehouse._id}`,
     {
       headers: {
         'Authorization': `Bearer ${accessToken}`
       }
     }
   );
   ```

---

## Testing

### Test Scenario 1: Mumbai Warehouse Manager
```bash
# Login as Mumbai warehouse manager
# Make API calls → should only see Mumbai warehouse data
```

### Test Scenario 2: Kolkata Warehouse Manager
```bash
# Login as Kolkata warehouse manager
# Make API calls → should only see Kolkata warehouse data
```

### Test Scenario 3: Cross-Warehouse Access Attempt
```bash
# Login as Mumbai warehouse manager
# Try to access Kolkata warehouse data → should get 403 error
```

---

## Summary

✅ **Warehouse managers are automatically scoped to their assigned warehouse**
✅ **No manual warehouseId injection needed in most cases**
✅ **Access to other warehouses is blocked**
✅ **Clear error messages when access is denied**
✅ **Works for all 10 warehouse management screens:**
   1. Dashboard
   2. Purchase Orders
   3. GRN (Goods Receipt Note)
   4. Dispatch Orders
   5. QC Templates
   6. Returns Management
   7. Field Agents
   8. Inventory Management
   9. Expense Management
   10. Reports & Analytics

---

## Support

If you encounter any issues:
1. Check that your user has the `warehouse_manager` role
2. Verify that a warehouse is assigned to your account using `/api/warehouse/warehouses/my-warehouse`
3. Ensure you're passing the correct `Authorization` header
4. Check the error response for specific details

For further assistance, contact the system administrator.
