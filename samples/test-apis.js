#!/usr/bin/env node

const TEST_APIS = [
  {
    name: "GET All Posts",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/posts",
    headers: { "Accept": "application/json" },
    expectedStatus: 200
  },
  {
    name: "GET Single Post",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/posts/1",
    headers: { "Accept": "application/json" },
    expectedStatus: 200
  },
  {
    name: "GET Comments",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/posts/1/comments",
    headers: { "Accept": "application/json" },
    expectedStatus: 200
  },
  {
    name: "POST Create Post",
    method: "POST",
    url: "https://jsonplaceholder.typicode.com/posts",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Test", body: "Testing Pulse", userId: 1 }),
    expectedStatus: 201
  },
  {
    name: "PUT Update Post",
    method: "PUT",
    url: "https://jsonplaceholder.typicode.com/posts/1",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: 1, title: "Updated", body: "Updated body", userId: 1 }),
    expectedStatus: 200
  },
  {
    name: "DELETE Post",
    method: "DELETE",
    url: "https://jsonplaceholder.typicode.com/posts/1",
    headers: {},
    expectedStatus: 200
  }
];

async function testApi(test) {
  const startTime = Date.now();
  try {
    const options = {
      method: test.method,
      headers: test.headers
    };
    if (test.body) {
      options.body = test.body;
    }
    
    const response = await fetch(test.url, options);
    const elapsed = Date.now() - startTime;
    const body = await response.text();
    
    const success = response.status === test.expectedStatus;
    const statusClass = response.status >= 200 && response.status < 300 ? '\x1b[32m' : '\x1b[31m';
    
    console.log(`\n${statusClass}${success ? '✓' : '✗'}\x1b[0m ${test.name}`);
    console.log(`  Method: ${test.method}`);
    console.log(`  URL: ${test.url}`);
    console.log(`  Status: ${response.status} (expected: ${test.expectedStatus})`);
    console.log(`  Time: ${elapsed}ms`);
    
    if (body.length < 500) {
      try {
        console.log(`  Response: ${JSON.stringify(JSON.parse(body), null, 2).slice(0, 200)}...`);
      } catch {
        console.log(`  Response: ${body.slice(0, 200)}...`);
      }
    } else {
      console.log(`  Response: [${body.length} bytes]`);
    }
    
    return success;
  } catch (error) {
    console.log(`\n\x1b[31m✗ ${test.name}\x1b[0m`);
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\x1b[1m\x1b[36m========================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m   Pulse API Client - Test Suite\x1b[0m');
  console.log('\x1b[1m\x1b[36m========================================\x1b[0m');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of TEST_APIS) {
    const result = await testApi(test);
    if (result) passed++;
    else failed++;
  }
  
  console.log('\n\x1b[1m\x1b[36m========================================\x1b[0m');
  console.log(`\x1b[1m\x1b[36mResults: ${passed} passed, ${failed} failed\x1b[0m`);
  console.log('\x1b[1m\x1b[36m========================================\x1b[0m\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
