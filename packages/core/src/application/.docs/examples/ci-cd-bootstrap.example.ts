/**
 * @example CI/CD Bootstrap
 * @description Bootstrap pattern for containerized deployments (Docker, Kubernetes)
 * @runnable true
 */

import { bootstrap } from '../../bootstrap';
import { AppExpress } from '@expressots/adapter-express';

class ContainerizedApp extends AppExpress {
  protected configureServices(): void {
    // Container-specific services
  }
}

/**
 * CI/CD pattern: Skip .env files, use process.env only
 * Variables come from:
 * - Docker: docker run -e VAR=value
 * - Kubernetes: ConfigMaps/Secrets
 * - CI/CD: Platform secrets
 */
async function runExample() {
  console.log('📘 Example: CI/CD Bootstrap');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Pattern 1: Explicit skip (recommended for clarity)
  const app1 = await bootstrap(ContainerizedApp, {
    envFileConfig: {
      skipFileLoading: true,  // Use process.env only
      required: ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET']
    }
  });
  
  console.log(`✅ Containerized app started on port ${app1.port}`);
  console.log('   Using environment variables from process.env');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await app1.close();
  
  // Pattern 2: CI mode (auto-detected, but can be explicit)
  // The framework auto-detects CI environments, but you can be explicit:
  const app2 = await bootstrap(ContainerizedApp, {
    envFileConfig: {
      ciMode: true,  // Explicit CI mode
      required: ['DATABASE_URL']
    }
  });
  
  console.log(`✅ CI/CD app started on port ${app2.port}`);
  await app2.close();
}

if (require.main === module) {
  runExample().catch(console.error);
}

export { runExample, ContainerizedApp };

