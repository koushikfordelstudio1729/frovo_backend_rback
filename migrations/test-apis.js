// Simple API testing script without TypeScript compilation issues
console.log('🚀 Starting API tests...');

const testAuth = async () => {
  console.log('\n1. Testing Authentication APIs');
  
  // Test customer registration
  try {
    const registerResponse = await fetch('http://localhost:3000/api/auth/register-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Customer',
        email: 'pandakoushik123@gmail.com',
        password: 'password123',
        phoneNumber: '+1234567890'
      })
    });
    const registerData = await registerResponse.json();
    console.log('✅ Customer Registration:', registerData.success ? 'Success' : 'Failed');
    
    if (registerData.success) {
      global.accessToken = registerData.data.tokens.accessToken;
      console.log('🔑 Got access token for further tests');
    }
  } catch (error) {
    console.log('❌ Registration failed:', error.message);
  }

  // Test customer login  
  try {
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pandakoushik123@gmail.com',
        password: 'password123'
      })
    });
    const loginData = await loginResponse.json();
    console.log('✅ Customer Login:', loginData.success ? 'Success' : 'Failed');
    
    if (loginData.success) {
      global.accessToken = loginData.data.tokens.accessToken;
      console.log('🔑 Updated access token from login');
    }
  } catch (error) {
    console.log('❌ Login failed:', error.message);
  }
};

const testVendingMachines = async () => {
  console.log('\n2. Testing Vending Machine APIs');
  
  try {
    // Get all machines
    const machinesResponse = await fetch('http://localhost:3000/api/vending/machines');
    const machinesData = await machinesResponse.json();
    console.log('✅ Get All Machines:', machinesData.success ? `Found ${machinesData.data.total} machines` : 'Failed');
    
    if (machinesData.success && machinesData.data.machines.length > 0) {
      global.testMachineId = machinesData.data.machines[0].machineId;
      console.log(`🏪 Using machine ${global.testMachineId} for tests`);
    }
  } catch (error) {
    console.log('❌ Get machines failed:', error.message);
  }

  try {
    // Get machines by location
    const locationResponse = await fetch('http://localhost:3000/api/vending/machines/locations?city=Mumbai');
    const locationData = await locationResponse.json();
    console.log('✅ Get Machines by Location:', locationData.success ? `Found ${locationData.data.total} machines in Mumbai` : 'Failed');
  } catch (error) {
    console.log('❌ Get machines by location failed:', error.message);
  }

  try {
    // Get machine products
    if (global.testMachineId) {
      const productsResponse = await fetch(`http://localhost:3000/api/vending/machines/${global.testMachineId}/products`);
      const productsData = await productsResponse.json();
      console.log('✅ Get Machine Products:', productsData.success ? `Found ${productsData.data.products.length} products` : 'Failed');
      
      if (productsData.success && productsData.data.products.length > 0) {
        global.testProduct = productsData.data.products[0];
        console.log(`📦 Using product ${global.testProduct.product.name} for tests`);
      }
    }
  } catch (error) {
    console.log('❌ Get machine products failed:', error.message);
  }
};

const testProducts = async () => {
  console.log('\n3. Testing Product APIs');
  
  try {
    // Get all products
    const productsResponse = await fetch('http://localhost:3000/api/products');
    const productsData = await productsResponse.json();
    console.log('✅ Get All Products:', productsData.success ? `Found ${productsData.data.total} products` : 'Failed');
  } catch (error) {
    console.log('❌ Get all products failed:', error.message);
  }

  try {
    // Get product categories
    const categoriesResponse = await fetch('http://localhost:3000/api/products/categories');
    const categoriesData = await categoriesResponse.json();
    console.log('✅ Get Categories:', categoriesData.success ? `Found ${categoriesData.data.length} categories` : 'Failed');
  } catch (error) {
    console.log('❌ Get categories failed:', error.message);
  }

  try {
    // Search products across machines
    const searchResponse = await fetch(`http://localhost:3000/api/vending/search-products?search=cola&currentMachine=${global.testMachineId}`);
    const searchData = await searchResponse.json();
    console.log('✅ Search Products:', searchData.success ? `Found ${searchData.data.productsFound.length} products, ${searchData.data.totalAlternatives} alternative machines` : 'Failed');
  } catch (error) {
    console.log('❌ Search products failed:', error.message);
  }
};

const testCartAndOrders = async () => {
  console.log('\n4. Testing Cart APIs (if server supports them)');
  
  if (!global.accessToken) {
    console.log('❌ No access token available for cart tests');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${global.accessToken}`
  };

  try {
    // Get empty cart
    const cartResponse = await fetch('http://localhost:3000/api/cart', { headers });
    const cartData = await cartResponse.json();
    console.log('✅ Get Cart:', cartData.success ? 'Success' : 'Failed');
  } catch (error) {
    console.log('❌ Get cart failed:', error.message);
  }

  // Add more cart tests if needed...
};

// Run all tests
const runAllTests = async () => {
  console.log('🧪 Running Complete API Test Suite\n');
  
  await testAuth();
  await testVendingMachines(); 
  await testProducts();
  await testCartAndOrders();
  
  console.log('\n🎉 API testing completed!');
  console.log('\n📋 Summary:');
  console.log('- Authentication APIs: Tested');
  console.log('- Vending Machine APIs: Tested');
  console.log('- Product APIs: Tested'); 
  console.log('- Cart APIs: Basic test attempted');
  console.log('\n💡 Next steps: Fix TypeScript issues and test full cart/order/payment flow');
};

// Start tests after a brief delay to ensure server is ready
setTimeout(runAllTests, 2000);