/**
 * @example Testing Bootstrap
 * @description Bootstrap pattern for integration tests with dynamic ports
 * @runnable true
 */

import { bootstrap } from '../../bootstrap';
import { AppExpress } from '@expressots/adapter-express';

class TestApp extends AppExpress {
  protected configureServices(): void {
    // Test-specific services
  }
}

/**
 * Testing pattern: Use port 0 for OS-assigned port
 * This enables parallel test execution without port conflicts
 */
async function runExample() {
  console.log('📘 Example: Testing Bootstrap');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Port 0 = OS-assigned port (perfect for testing)
  const app = await bootstrap(TestApp, {
    port: 0,
    envFileConfig: {
      skipFileLoading: true,  // Use process.env only in tests
      required: []  // Skip validation in tests
    }
  });
  
  // Use the actual assigned port in your tests
  const actualPort = app.port;
  
  console.assert(actualPort > 0, 'Port should be assigned by OS');
  console.assert(actualPort !== 3000, 'Port should not be default');
  
  console.log(`✅ Test app started on dynamic port: ${actualPort}`);
  console.log('   This enables parallel test execution');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await app.close();
}

/**
 * Example test using the bootstrap pattern
 */
export async function createTestServer() {
  return await bootstrap(TestApp, {
    port: 0,
    envFileConfig: {
      skipFileLoading: true
    }
  });
}

if (require.main === module) {
  runExample().catch(console.error);
}

export { runExample, TestApp };

