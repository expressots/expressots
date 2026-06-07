## What This Repo Does

This repository holds templates the ExpressoTS CLI uses for CI/CD pipelines (GitHub Actions, GitLab CI, CircleCI, Jenkins), Docker configurations, Kubernetes manifests, and cloud migration guides. Templates version independently from the CLI.

```bash
expressots templates list
expressots templates update
expressots cicd generate github --strategy comprehensive
```

## For Contributors

1. Fork this repository
2. Edit or add a template under the appropriate directory
3. Update `manifest.json` with the new version
4. Test with `expressots templates repo set YOUR_USERNAME/templates`
5. Submit a pull request

## For Organizations

```bash
expressots templates repo set mycompany/expressots-templates
expressots cicd generate github
```
