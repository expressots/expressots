# ExpressoTS Templates Repository

Community-maintained templates and pricing data for the [ExpressoTS CLI](https://github.com/expressots/expressots-cli).

## What's This?

This repository contains all the templates used by ExpressoTS CLI to generate:
- **CI/CD Pipelines** (GitHub Actions, GitLab CI, CircleCI, Jenkins, etc.)
- **Docker Configurations** (Dockerfiles, docker-compose)
- **Kubernetes Manifests** (deployments, services, ingress)
- **Migration Guides** (Heroku → Railway/Render/Fly, Compose → K8s)
- **Cloud Provider Pricing** (for cost estimation)

## Why a Separate Repository?

**Fast Updates:** Templates can be updated without releasing a new CLI version. Users get updates within 24 hours.

**Community Contributions:** Anyone can contribute templates or update pricing - no CLI expertise needed.

**Offline Support:** CLI has embedded fallbacks, so it works without internet.

**Version Control:** Templates are versioned independently from the CLI.

## Repository Structure

```
cli-templates/
├── manifest.json              # Template registry with versions
├── pricing.json               # Cloud provider pricing data
├── README.md                  # This file
├── cicd/                      # CI/CD pipeline templates
│   ├── github/
│   │   ├── basic.yml
│   │   ├── comprehensive.yml
│   │   └── security-focused.yml
│   ├── gitlab/
│   ├── circleci/
│   ├── jenkins/
│   ├── bitbucket/
│   └── azure/
├── docker/                    # Docker templates
│   ├── Dockerfile.production.tpl
│   ├── Dockerfile.development.tpl
│   ├── docker-compose.yml.tpl
│   └── docker-compose.development.yml.tpl
├── kubernetes/                # Kubernetes manifest templates
│   ├── deployment.yml.tpl
│   ├── service.yml.tpl
│   ├── configmap.yml.tpl
│   └── ingress.yml.tpl
└── migrations/                # Migration templates
    ├── heroku-to-railway/
    ├── heroku-to-render/
    ├── heroku-to-fly/
    └── compose-to-kubernetes/
```

## How to Use

### For Users

Users don't need to interact with this repository directly. The ExpressoTS CLI automatically fetches templates:

```bash
# List available templates
expressots templates list

# Update to latest versions
expressots templates update

# Generate CI/CD pipeline
expressots cicd generate github --strategy comprehensive
```

### For Contributors

Want to improve templates or update pricing? See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed instructions.

**Quick start:**

1. Fork this repository
2. Edit a template file (e.g., `cicd/github/basic.yml`)
3. Update `manifest.json` with new version
4. Test locally:
   ```bash
   expressots templates repo set YOUR_USERNAME/templates
   expressots templates update
   expressots cicd generate github
   ```
5. Submit a pull request

### For Organizations

Use custom templates for your organization:

```bash
# Fork this repo, customize, then:
expressots templates repo set mycompany/expressots-templates

# Team members automatically get company templates
expressots cicd generate github
```

## Template Syntax

Templates use Mustache-like syntax:

```yaml
name: {{projectName}}

{{#includeSecurity}}
security:
  scan: enabled
{{/includeSecurity}}

{{^isProduction}}
dev-tools:
  - nodemon
{{/isProduction}}
```

**Supported:**
- Variables: `{{name}}`
- Conditionals: `{{#cond}}...{{/cond}}`
- Negative conditionals: `{{^cond}}...{{/cond}}`
- Loops: `{{#each items}}...{{/each}}`

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- How to add new templates
- How to update pricing data
- Testing guidelines
- Review process
- Best practices

**Common contributions:**
- Add new CI/CD strategies
- Update cloud provider pricing
- Improve security scanning
- Add new platform support
- Fix bugs in templates

## Pricing Data

Cloud provider pricing is stored in `cli-templates/pricing.json` and used by the CLI's cost estimation features.

**Updating pricing:**

1. Visit official pricing pages (links in `pricing.json`)
2. Update prices for a provider
3. Update `lastVerified` date
4. Submit PR with source URLs

**Example:**
```json
{
  "providers": {
    "aws": {
      "cpuPerHour": 0.04048,
      "source": "https://aws.amazon.com/fargate/pricing/",
      "lastVerified": "2026-01-15"
    }
  }
}
```

## Versioning

### Template Versions

Each template has its own version:
- **Patch (1.0.1):** Bug fixes, typos
- **Minor (1.1.0):** New features, backward compatible
- **Major (2.0.0):** Breaking changes

### Manifest Version

The manifest version tracks overall structure changes:
```json
{
  "version": "1.0.0",
  "updated": "2026-01-07T00:00:00Z"
}
```

## Release Process

1. PRs merged to `main` branch
2. CI validates manifest and templates
3. Changes immediately available to CLI users
4. Users' local cache updates within 24 hours
5. Or manually: `expressots templates update`

## Support

- **Documentation:** https://expresso-ts.com/docs/cli/templates
- **Issues:** https://github.com/expressots/expressots-cli/issues
- **Discord:** https://discord.gg/expressots

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

This repository is maintained by the ExpressoTS community. Special thanks to all contributors who help keep templates and pricing data up-to-date!

---

**Built with ❤️ by the ExpressoTS community**
