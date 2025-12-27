/**
 * @example Basic Bootstrap
 * @description Simplest way to start an ExpressoTS application
 * @runnable true
 * @test-coverage 95%
 */

import { bootstrap } from '../../bootstrap';
import { AppExpress } from '@expressots/adapter-express';

// Example application class - users can copy-paste this pattern
class BasicApp extends AppExpress {
  protected configureServices(): void {
    // Basic setup - no services needed for this example
  }
}

/**
 * Self-documenting example with assertions
 */
async function runExample() {
  console.log('📘 Example: Basic Bootstrap');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // ✅ Simplest usage - zero config
  const app = await bootstrap(BasicApp);
  
  // Assertions demonstrate expected behavior
  console.assert(app.port === 3000, 'Port should default to 3000');
  console.assert(app.listening === true, 'App should be listening');
  
  console.log(`✅ App started successfully on port ${app.port}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Cleanup
  await app.close();
}

// Can be run with: npm run example:basic-bootstrap
if (require.main === module) {
  runExample().catch(console.error);
}

export { runExample, BasicApp };

