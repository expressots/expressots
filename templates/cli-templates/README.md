# ExpressoTS CLI Templates

This directory contains templates used by the ExpressoTS CLI for generating CI/CD pipelines, Docker configurations, Kubernetes manifests, and migration guides.

## Structure

```
cli-templates/
├── manifest.json              # Template registry with versions
├── cicd/                      # CI/CD pipeline templates
│   ├── github/
│   │   ├── basic.yml
│   │   ├── comprehensive.yml
│   │   └── security-focused.yml
│   ├── gitlab/
│   │   ├── basic.yml
│   │   ├── comprehensive.yml
│   │   └── security-focused.yml
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

## Template Syntax

Templates use Mustache-like syntax:

- `{{variable}}` - Variable substitution
- `{{#condition}}...{{/condition}}` - Conditional blocks
- `{{^condition}}...{{/condition}}` - Negative conditionals

## Usage

```bash
# List available templates
expressots templates list

# Update cache
expressots templates update

# Show status
expressots templates status
```

## Contributing

1. Fork this repository
2. Add or modify templates
3. Update manifest.json
4. Submit a pull request

## License

MIT License
