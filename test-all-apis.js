#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

let authToken = '';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Add auth header interceptor
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAuth() {
  console.log('\n=== TESTING AUTH APIS ===');
  
  try {
    // Register a new user
    console.log('\n1. Testing customer registration...');
    const registerResponse = await api.post('/auth/register-customer', {
      name: 'API Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      phone: '+919876543210'
    });
    console.log('✅ Registration successful');
    console.log('User:', registerResponse.data.data.user.name);
    
    // Login
    console.log('\n2. Testing login...');
    const loginResponse = await api.post('/auth/login', {
      email: registerResponse.data.data.user.email,
      password: 'password123'
    });
    console.log('✅ Login successful');
    authToken = loginResponse.data.data.accessToken;
    console.log('Token received:', authToken.substring(0, 50) + '...');
    
    return loginResponse.data.data;
  } catch (error) {
    console.error('❌ Auth test failed:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function testProducts() {
  console.log('\n=== TESTING PRODUCT APIS ===');
  
  try {
    // Get all products
    console.log('\n1. Testing get all products...');
    const productsResponse = await api.get('/products');
    console.log('✅ Products retrieved successfully');
    console.log(`Found ${productsResponse.data.data.products.length} products`);
    
    // Get categories
    console.log('\n2. Testing get categories...');
    const categoriesResponse = await api.get('/products/categories');
    console.log('✅ Categories retrieved successfully');
    console.log('Categories:', categoriesResponse.data.data.categories.slice(0, 3));
    
    // Get products by category
    const firstCategory = categoriesResponse.data.data.categories[0];
    console.log(`\n3. Testing get products by category (${firstCategory})...`);
    const categoryProductsResponse = await api.get(`/products/category/${firstCategory}`);
    console.log('✅ Category products retrieved successfully');
    
    // Get product by ID
    const firstProduct = productsResponse.data.data.products[0];
    console.log(`\n4. Testing get product by ID (${firstProduct.id})...`);
    const productResponse = await api.get(`/products/${firstProduct.id}`);
    console.log('✅ Product by ID retrieved successfully');
    console.log('Product:', productResponse.data.data.name);
    
    return { products: productsResponse.data.data.products, firstProduct };
  } catch (error) {
    console.error('❌ Product test failed:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function testVendingMachines() {
  console.log('\n=== TESTING VENDING MACHINE APIS ===');
  
  try {
    // Get all machines
    console.log('\n1. Testing get all machines...');
    const machinesResponse = await api.get('/vending/machines');
    console.log('✅ Machines retrieved successfully');
    console.log(`Found ${machinesResponse.data.data.machines.length} machines`);
    
    // Get machines by location
    console.log('\n2. Testing get machines by location...');
    const locationsResponse = await api.get('/vending/machines/locations');
    console.log('✅ Machines by location retrieved successfully');
    
    // Get specific machine
    const firstMachine = machinesResponse.data.data.machines[0];
    console.log(`\n3. Testing get machine by ID (${firstMachine.machineId})...`);
    const machineResponse = await api.get(`/vending/machines/${firstMachine.machineId}`);
    console.log('✅ Machine by ID retrieved successfully');
    console.log('Machine:', machineResponse.data.data.name);
    
    // Get machine products
    console.log(`\n4. Testing get machine products (${firstMachine.machineId})...`);
    const machineProductsResponse = await api.get(`/vending/machines/${firstMachine.machineId}/products`);
    console.log('✅ Machine products retrieved successfully');
    console.log(`Found ${machineProductsResponse.data.data.products.length} products in machine`);
    
    return { machines: machinesResponse.data.data.machines, firstMachine };
  } catch (error) {
    console.error('❌ Vending machine test failed:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function testCart(products, machine) {
  console.log('\n=== TESTING CART APIS ===');
  
  try {
    // Get initial cart
    console.log('\n1. Testing get cart...');
    const cartResponse = await api.get('/cart');
    console.log('✅ Cart retrieved successfully');
    console.log('Cart is empty:', cartResponse.data.data.isEmpty);
    
    // Add item to cart
    console.log('\n2. Testing add to cart...');
    const addResponse = await api.post('/cart/add', {
      productId: products[0].id,
      machineId: machine.machineId,
      slotNumber: 'A1',
      quantity: 2
    });
    console.log('✅ Item added to cart successfully');
    
    // Get cart summary
    console.log('\n3. Testing get cart summary...');
    const summaryResponse = await api.get('/cart/summary');
    console.log('✅ Cart summary retrieved successfully');
    console.log('Total items:', summaryResponse.data.data.totalItems);
    console.log('Total amount:', summaryResponse.data.data.totalAmount);
    
    // Validate cart
    console.log('\n4. Testing validate cart...');
    const validateResponse = await api.get('/cart/validate');
    console.log('✅ Cart validation successful');
    
    // Update cart item
    console.log('\n5. Testing update cart item...');
    const updateResponse = await api.put(`/cart/item/${products[0].id}/${machine.machineId}/A1`, {
      quantity: 1
    });
    console.log('✅ Cart item updated successfully');
    
    // Clear cart (for cleanup)
    console.log('\n6. Testing clear cart...');
    const clearResponse = await api.delete('/cart/clear');
    console.log('✅ Cart cleared successfully');
    
    return cartResponse.data.data;
  } catch (error) {
    console.error('❌ Cart test failed:', error.response?.data?.message || error.message);
    console.error('Error details:', error.response?.data);
    throw error;
  }
}

async function testOrders(products, machine) {
  console.log('\n=== TESTING ORDER APIS ===');
  
  try {
    // Add item to cart first
    await api.post('/cart/add', {
      productId: products[0].id,
      machineId: machine.machineId,
      slotNumber: 'A1',
      quantity: 1
    });
    
    // Create order
    console.log('\n1. Testing create order...');
    const orderResponse = await api.post('/orders', {
      paymentMethod: 'Card'
    });
    console.log('✅ Order created successfully');
    console.log('Order ID:', orderResponse.data.data.orderId);
    
    const orderId = orderResponse.data.data.orderId;
    
    // Get user orders
    console.log('\n2. Testing get my orders...');
    const myOrdersResponse = await api.get('/orders/my-orders');
    console.log('✅ My orders retrieved successfully');
    console.log(`Found ${myOrdersResponse.data.data.orders.length} orders`);
    
    // Get specific order
    console.log(`\n3. Testing get order by ID (${orderId})...`);
    const getOrderResponse = await api.get(`/orders/${orderId}`);
    console.log('✅ Order by ID retrieved successfully');
    
    // Get order summary
    console.log(`\n4. Testing get order summary (${orderId})...`);
    const orderSummaryResponse = await api.get(`/orders/${orderId}/summary`);
    console.log('✅ Order summary retrieved successfully');
    
    // Get user stats
    console.log('\n5. Testing get user order stats...');
    const statsResponse = await api.get('/orders/my-stats');
    console.log('✅ Order stats retrieved successfully');
    
    return { orderId, order: orderResponse.data.data };
  } catch (error) {
    console.error('❌ Order test failed:', error.response?.data?.message || error.message);
    console.error('Error details:', error.response?.data);
    throw error;
  }
}

async function testPayments(orderId) {
  console.log('\n=== TESTING PAYMENT APIS ===');
  
  try {
    // Initiate payment
    console.log('\n1. Testing initiate payment...');
    const initiateResponse = await api.post('/payments/initiate', {
      orderId: orderId,
      paymentMethod: 'Card',
      amount: 50
    });
    console.log('✅ Payment initiated successfully');
    console.log('Payment ID:', initiateResponse.data.data.paymentId);
    
    const paymentId = initiateResponse.data.data.paymentId;
    
    // Get user payments
    console.log('\n2. Testing get my payments...');
    const myPaymentsResponse = await api.get('/payments/my-payments');
    console.log('✅ My payments retrieved successfully');
    
    // Get specific payment
    console.log(`\n3. Testing get payment by ID (${paymentId})...`);
    const paymentResponse = await api.get(`/payments/${paymentId}`);
    console.log('✅ Payment by ID retrieved successfully');
    
    // Get payment stats
    console.log('\n4. Testing get payment stats...');
    const paymentStatsResponse = await api.get('/payments/my-stats');
    console.log('✅ Payment stats retrieved successfully');
    
    // Mock payment success
    console.log(`\n5. Testing mock payment success (${paymentId})...`);
    const mockSuccessResponse = await api.post(`/payments/mock/${paymentId}/success`);
    console.log('✅ Mock payment success completed');
    
    return { paymentId, payment: initiateResponse.data.data };
  } catch (error) {
    console.error('❌ Payment test failed:', error.response?.data?.message || error.message);
    console.error('Error details:', error.response?.data);
    throw error;
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive API tests...');
  
  try {
    // Test Auth
    const authData = await testAuth();
    
    // Test Products
    const { products, firstProduct } = await testProducts();
    
    // Test Vending Machines  
    const { machines, firstMachine } = await testVendingMachines();
    
    // Test Cart
    await testCart(products, firstMachine);
    
    // Test Orders
    const { orderId, order } = await testOrders(products, firstMachine);
    
    // Test Payments
    await testPayments(orderId);
    
    console.log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
    console.log('\nTest Summary:');
    console.log('- Auth APIs: ✅ Working');
    console.log('- Product APIs: ✅ Working');
    console.log('- Vending Machine APIs: ✅ Working');
    console.log('- Cart APIs: ✅ Working');
    console.log('- Order APIs: ✅ Working');
    console.log('- Payment APIs: ✅ Working');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runAllTests();