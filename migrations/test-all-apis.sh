#!/bin/bash

set -e  # Exit on any error

BASE_URL="http://localhost:3000/api"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test-${TIMESTAMP}@example.com"

echo "🚀 Starting comprehensive API tests..."
echo "Using email: $TEST_EMAIL"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print test headers
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error and exit
print_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Test server health
print_header "TESTING SERVER HEALTH"
echo "1. Testing server health..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/../health") || print_error "Server not responding"
echo "$HEALTH_RESPONSE" | jq . > /dev/null || print_error "Invalid JSON response"
print_success "Server is healthy"

# Test Auth APIs
print_header "TESTING AUTH APIS"

echo "1. Testing customer registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register-customer" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"API Test User\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"password123\",
    \"phone\": \"+919876543210\"
  }") || print_error "Registration request failed"

echo "$REGISTER_RESPONSE" | jq . > /dev/null || print_error "Invalid registration response"
REGISTER_SUCCESS=$(echo "$REGISTER_RESPONSE" | jq -r '.success')
if [ "$REGISTER_SUCCESS" != "true" ]; then
    print_error "Registration failed: $(echo "$REGISTER_RESPONSE" | jq -r '.message')"
fi
print_success "Customer registration successful"

echo "2. Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"password123\"
  }") || print_error "Login request failed"

echo "$LOGIN_RESPONSE" | jq . > /dev/null || print_error "Invalid login response"
LOGIN_SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success')
if [ "$LOGIN_SUCCESS" != "true" ]; then
    print_error "Login failed: $(echo "$LOGIN_RESPONSE" | jq -r '.message')"
fi

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user._id')
if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    print_error "No access token received"
fi
print_success "Login successful"

# Test Product APIs
print_header "TESTING PRODUCT APIS"

echo "1. Testing get all products..."
PRODUCTS_RESPONSE=$(curl -s "$BASE_URL/products") || print_error "Products request failed"
echo "$PRODUCTS_RESPONSE" | jq . > /dev/null || print_error "Invalid products response"
PRODUCTS_SUCCESS=$(echo "$PRODUCTS_RESPONSE" | jq -r '.success')
if [ "$PRODUCTS_SUCCESS" != "true" ]; then
    print_error "Get products failed: $(echo "$PRODUCTS_RESPONSE" | jq -r '.message')"
fi
FIRST_PRODUCT_ID=$(echo "$PRODUCTS_RESPONSE" | jq -r '.data.products[0].id')
print_success "Products retrieved successfully"

echo "2. Testing get product categories..."
CATEGORIES_RESPONSE=$(curl -s "$BASE_URL/products/categories") || print_error "Categories request failed"
CATEGORIES_SUCCESS=$(echo "$CATEGORIES_RESPONSE" | jq -r '.success')
if [ "$CATEGORIES_SUCCESS" != "true" ]; then
    print_error "Get categories failed"
fi
FIRST_CATEGORY=$(echo "$CATEGORIES_RESPONSE" | jq -r '.data[0].category')
print_success "Categories retrieved successfully"

echo "3. Testing get products by category..."
CATEGORY_PRODUCTS_RESPONSE=$(curl -s "$BASE_URL/products/category/$FIRST_CATEGORY") || print_error "Category products request failed"
CATEGORY_PRODUCTS_SUCCESS=$(echo "$CATEGORY_PRODUCTS_RESPONSE" | jq -r '.success')
if [ "$CATEGORY_PRODUCTS_SUCCESS" != "true" ]; then
    print_error "Get products by category failed"
fi
print_success "Products by category retrieved successfully"

echo "4. Testing get product by ID..."
PRODUCT_RESPONSE=$(curl -s "$BASE_URL/products/$FIRST_PRODUCT_ID") || print_error "Product by ID request failed"
PRODUCT_SUCCESS=$(echo "$PRODUCT_RESPONSE" | jq -r '.success')
if [ "$PRODUCT_SUCCESS" != "true" ]; then
    print_error "Get product by ID failed"
fi
print_success "Product by ID retrieved successfully"

# Test Vending Machine APIs
print_header "TESTING VENDING MACHINE APIS"

echo "1. Testing get all machines..."
MACHINES_RESPONSE=$(curl -s "$BASE_URL/vending/machines") || print_error "Machines request failed"
MACHINES_SUCCESS=$(echo "$MACHINES_RESPONSE" | jq -r '.success')
if [ "$MACHINES_SUCCESS" != "true" ]; then
    print_error "Get machines failed"
fi
FIRST_MACHINE_ID=$(echo "$MACHINES_RESPONSE" | jq -r '.data.machines[0].machineId')
print_success "Machines retrieved successfully"

echo "2. Testing get machines by location..."
LOCATIONS_RESPONSE=$(curl -s "$BASE_URL/vending/machines/locations") || print_error "Locations request failed"
LOCATIONS_SUCCESS=$(echo "$LOCATIONS_RESPONSE" | jq -r '.success')
if [ "$LOCATIONS_SUCCESS" != "true" ]; then
    print_error "Get machines by location failed"
fi
print_success "Machines by location retrieved successfully"

echo "3. Testing get machine by ID..."
MACHINE_RESPONSE=$(curl -s "$BASE_URL/vending/machines/$FIRST_MACHINE_ID") || print_error "Machine by ID request failed"
MACHINE_SUCCESS=$(echo "$MACHINE_RESPONSE" | jq -r '.success')
if [ "$MACHINE_SUCCESS" != "true" ]; then
    print_error "Get machine by ID failed"
fi
print_success "Machine by ID retrieved successfully"

echo "4. Testing get machine products..."
MACHINE_PRODUCTS_RESPONSE=$(curl -s "$BASE_URL/vending/machines/$FIRST_MACHINE_ID/products") || print_error "Machine products request failed"
MACHINE_PRODUCTS_SUCCESS=$(echo "$MACHINE_PRODUCTS_RESPONSE" | jq -r '.success')
if [ "$MACHINE_PRODUCTS_SUCCESS" != "true" ]; then
    print_error "Get machine products failed"
fi
print_success "Machine products retrieved successfully"

# Test Cart APIs
print_header "TESTING CART APIS"

echo "1. Testing get cart..."
CART_RESPONSE=$(curl -s -X GET "$BASE_URL/cart" \
  -H "Authorization: Bearer $TOKEN") || print_error "Get cart request failed"
CART_SUCCESS=$(echo "$CART_RESPONSE" | jq -r '.success')
if [ "$CART_SUCCESS" != "true" ]; then
    print_error "Get cart failed: $(echo "$CART_RESPONSE" | jq -r '.message')"
fi
print_success "Cart retrieved successfully"

# Get a product that's actually in the machine
MACHINE_PRODUCT_ID=$(curl -s "$BASE_URL/vending/machines/$FIRST_MACHINE_ID/products" | jq -r '.data.products[0].product.id')
MACHINE_SLOT_NUMBER=$(curl -s "$BASE_URL/vending/machines/$FIRST_MACHINE_ID/products" | jq -r '.data.products[0].slotNumber')

echo "2. Testing add to cart..."
ADD_CART_RESPONSE=$(curl -s -X POST "$BASE_URL/cart/add" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$MACHINE_PRODUCT_ID\",
    \"machineId\": \"$FIRST_MACHINE_ID\",
    \"slotNumber\": \"$MACHINE_SLOT_NUMBER\",
    \"quantity\": 2
  }") || print_error "Add to cart request failed"
ADD_CART_SUCCESS=$(echo "$ADD_CART_RESPONSE" | jq -r '.success')
if [ "$ADD_CART_SUCCESS" != "true" ]; then
    print_error "Add to cart failed: $(echo "$ADD_CART_RESPONSE" | jq -r '.message')"
fi
print_success "Item added to cart successfully"

echo "3. Testing cart summary..."
CART_SUMMARY_RESPONSE=$(curl -s -X GET "$BASE_URL/cart/summary" \
  -H "Authorization: Bearer $TOKEN") || print_error "Cart summary request failed"
CART_SUMMARY_SUCCESS=$(echo "$CART_SUMMARY_RESPONSE" | jq -r '.success')
if [ "$CART_SUMMARY_SUCCESS" != "true" ]; then
    print_error "Get cart summary failed"
fi
print_success "Cart summary retrieved successfully"

echo "4. Testing validate cart..."
VALIDATE_CART_RESPONSE=$(curl -s -X GET "$BASE_URL/cart/validate" \
  -H "Authorization: Bearer $TOKEN") || print_error "Validate cart request failed"
VALIDATE_CART_SUCCESS=$(echo "$VALIDATE_CART_RESPONSE" | jq -r '.success')
if [ "$VALIDATE_CART_SUCCESS" != "true" ]; then
    print_error "Validate cart failed"
fi
print_success "Cart validation successful"

echo "5. Testing update cart item..."
UPDATE_CART_RESPONSE=$(curl -s -X PUT "$BASE_URL/cart/item/$MACHINE_PRODUCT_ID/$FIRST_MACHINE_ID/$MACHINE_SLOT_NUMBER" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"quantity\": 1
  }") || print_error "Update cart request failed"
UPDATE_CART_SUCCESS=$(echo "$UPDATE_CART_RESPONSE" | jq -r '.success')
if [ "$UPDATE_CART_SUCCESS" != "true" ]; then
    print_error "Update cart item failed"
fi
print_success "Cart item updated successfully"

# Test Order APIs
print_header "TESTING ORDER APIS"

# Add item to cart for order creation (cart was cleared earlier)
echo "Adding item to cart for order creation..."
curl -s -X POST "$BASE_URL/cart/add" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$MACHINE_PRODUCT_ID\",
    \"machineId\": \"$FIRST_MACHINE_ID\",
    \"slotNumber\": \"$MACHINE_SLOT_NUMBER\",
    \"quantity\": 1
  }" > /dev/null

echo "1. Testing create order..."
CREATE_ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"paymentMethod\": \"card\",
    \"paymentGateway\": \"razorpay\"
  }") || print_error "Create order request failed"
CREATE_ORDER_SUCCESS=$(echo "$CREATE_ORDER_RESPONSE" | jq -r '.success')
if [ "$CREATE_ORDER_SUCCESS" != "true" ]; then
    print_error "Create order failed: $(echo "$CREATE_ORDER_RESPONSE" | jq -r '.message')"
fi
ORDER_ID=$(echo "$CREATE_ORDER_RESPONSE" | jq -r '.data.orderId')
print_success "Order created successfully"

echo "2. Testing get my orders..."
MY_ORDERS_RESPONSE=$(curl -s -X GET "$BASE_URL/orders/my-orders" \
  -H "Authorization: Bearer $TOKEN") || print_error "Get my orders request failed"
MY_ORDERS_SUCCESS=$(echo "$MY_ORDERS_RESPONSE" | jq -r '.success')
if [ "$MY_ORDERS_SUCCESS" != "true" ]; then
    print_error "Get my orders failed"
fi
print_success "My orders retrieved successfully"

echo "3. Testing get order by ID..."
ORDER_DETAIL_RESPONSE=$(curl -s -X GET "$BASE_URL/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN") || print_error "Get order detail request failed"
ORDER_DETAIL_SUCCESS=$(echo "$ORDER_DETAIL_RESPONSE" | jq -r '.success')
if [ "$ORDER_DETAIL_SUCCESS" != "true" ]; then
    print_error "Get order detail failed"
fi
print_success "Order detail retrieved successfully"

echo "4. Testing get order summary..."
ORDER_SUMMARY_RESPONSE=$(curl -s -X GET "$BASE_URL/orders/$ORDER_ID/summary" \
  -H "Authorization: Bearer $TOKEN") || print_error "Get order summary request failed"
ORDER_SUMMARY_SUCCESS=$(echo "$ORDER_SUMMARY_RESPONSE" | jq -r '.success')
if [ "$ORDER_SUMMARY_SUCCESS" != "true" ]; then
    print_error "Get order summary failed"
fi
print_success "Order summary retrieved successfully"

echo "5. Testing get order stats..."
ORDER_STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/orders/my-stats" \
  -H "Authorization: Bearer $TOKEN") || print_error "Get order stats request failed"
ORDER_STATS_SUCCESS=$(echo "$ORDER_STATS_RESPONSE" | jq -r '.success')
if [ "$ORDER_STATS_SUCCESS" != "true" ]; then
    print_error "Get order stats failed"
fi
print_success "Order stats retrieved successfully"

# Test Payment APIs
print_header "TESTING PAYMENT APIS"

echo "1. Testing initiate payment..."
INITIATE_PAYMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/payments/initiate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"paymentMethod\": \"card\",
    \"paymentGateway\": \"razorpay\",
    \"amount\": 50
  }") || print_error "Initiate payment request failed"
INITIATE_PAYMENT_SUCCESS=$(echo "$INITIATE_PAYMENT_RESPONSE" | jq -r '.success')
if [ "$INITIATE_PAYMENT_SUCCESS" != "true" ]; then
    print_error "Initiate payment failed: $(echo "$INITIATE_PAYMENT_RESPONSE" | jq -r '.message')"
fi
PAYMENT_ID=$(echo "$INITIATE_PAYMENT_RESPONSE" | jq -r '.data.paymentId')
print_success "Payment initiated successfully"

echo "2. Testing get my payments..."
MY_PAYMENTS_RESPONSE=$(curl -s -X GET "$BASE_URL/payments/my-payments" \
  -H "Authorization: Bearer $TOKEN") || print_error "Get my payments request failed"
MY_PAYMENTS_SUCCESS=$(echo "$MY_PAYMENTS_RESPONSE" | jq -r '.success')
if [ "$MY_PAYMENTS_SUCCESS" != "true" ]; then
    print_error "Get my payments failed"
fi
print_success "My payments retrieved successfully"

echo "3. Testing get payment by ID..."
PAYMENT_DETAIL_RESPONSE=$(curl -s -X GET "$BASE_URL/payments/$PAYMENT_ID" \
  -H "Authorization: Bearer $TOKEN") || print_error "Get payment detail request failed"
PAYMENT_DETAIL_SUCCESS=$(echo "$PAYMENT_DETAIL_RESPONSE" | jq -r '.success')
if [ "$PAYMENT_DETAIL_SUCCESS" != "true" ]; then
    print_error "Get payment detail failed"
fi
print_success "Payment detail retrieved successfully"

echo "4. Testing get payment stats..."
PAYMENT_STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/payments/my-stats" \
  -H "Authorization: Bearer $TOKEN") || print_error "Get payment stats request failed"
PAYMENT_STATS_SUCCESS=$(echo "$PAYMENT_STATS_RESPONSE" | jq -r '.success')
if [ "$PAYMENT_STATS_SUCCESS" != "true" ]; then
    print_error "Get payment stats failed"
fi
print_success "Payment stats retrieved successfully"

echo "5. Testing mock payment success..."
MOCK_SUCCESS_RESPONSE=$(curl -s -X POST "$BASE_URL/payments/mock/$PAYMENT_ID/success" \
  -H "Content-Type: application/json") || print_error "Mock payment success request failed"
MOCK_SUCCESS_SUCCESS=$(echo "$MOCK_SUCCESS_RESPONSE" | jq -r '.success')
if [ "$MOCK_SUCCESS_SUCCESS" != "true" ]; then
    print_error "Mock payment success failed"
fi
print_success "Mock payment success completed"

# Cleanup - clear cart
echo "6. Testing clear cart (cleanup)..."
CLEAR_CART_RESPONSE=$(curl -s -X DELETE "$BASE_URL/cart/clear" \
  -H "Authorization: Bearer $TOKEN") || print_error "Clear cart request failed"
CLEAR_CART_SUCCESS=$(echo "$CLEAR_CART_RESPONSE" | jq -r '.success')
if [ "$CLEAR_CART_SUCCESS" != "true" ]; then
    print_error "Clear cart failed"
fi
print_success "Cart cleared successfully"

# Final summary
print_header "TEST SUMMARY"
echo -e "${GREEN}✅ ALL TESTS COMPLETED SUCCESSFULLY! 🎉${NC}"
echo ""
echo "Test Summary:"
echo -e "- ${GREEN}Auth APIs: ✅ Working${NC}"
echo -e "- ${GREEN}Product APIs: ✅ Working${NC}"
echo -e "- ${GREEN}Vending Machine APIs: ✅ Working${NC}"
echo -e "- ${GREEN}Cart APIs: ✅ Working${NC}"
echo -e "- ${GREEN}Order APIs: ✅ Working${NC}"
echo -e "- ${GREEN}Payment APIs: ✅ Working${NC}"
echo ""
echo "Test Details:"
echo "- Test user email: $TEST_EMAIL"
echo "- Test user ID: $USER_ID"
echo "- Test order ID: $ORDER_ID"
echo "- Test payment ID: $PAYMENT_ID"
echo ""
echo -e "${BLUE}All APIs are functioning correctly! 🚀${NC}"