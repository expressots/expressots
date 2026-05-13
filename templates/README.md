<div align="center">
  <a href="https://expresso-ts.com">
    <img src="https://github.com/expressots/expressots/blob/main/media/expressots.png" alt="ExpressoTS" width="120">
  </a>

  <h1>@expressots/templates</h1>

  <p>Community-maintained templates for CI/CD, Docker, Kubernetes, and cloud migrations — consumed by the ExpressoTS CLI.</p>

  <p>
    <a href="https://www.npmjs.com/package/@expressots/templates"><img src="https://img.shields.io/npm/v/@expressots/templates?style=flat&color=0d0d0d" alt="npm"></a>
    <a href="https://github.com/expressots/templates/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/expressots/templates?style=flat&color=0d0d0d" alt="License"></a>
    <a href="https://discord.com/invite/PyPJfGK"><img src="https://img.shields.io/badge/Discord-join-0d0d0d?logo=discord&logoColor=white" alt="Discord"></a>
  </p>

  <p>
    <a href="https://doc.expresso-ts.com">Documentation</a> ·
    <a href="https://doc.expresso-ts.com/docs/cli/overview">CLI Reference</a> ·
    <a href="https://discord.com/invite/PyPJfGK">Community</a>
  </p>
</div>

---

## What This Repo Does

This repository holds every template the ExpressoTS CLI uses to generate CI/CD pipelines (GitHub Actions, GitLab CI, CircleCI, Jenkins, etc.), Docker configurations, Kubernetes manifests, and cloud migration guides. Templates are versioned independently from the CLI so updates ship without a new CLI release.

Users don't interact with this repo directly — the CLI fetches templates automatically:

```bash
expressots templates list
expressots templates update
expressots cicd generate github --strategy comprehensive
```

## For Contributors

1. Fork this repository
2. Edit or add a template under the appropriate directory
3. Update `manifest.json` with the new version
4. Test locally:
   ```bash
   expressots templates repo set YOUR_USERNAME/templates
   expressots templates update
   expressots cicd generate github
   ```
5. Submit a pull request

## For Organizations

```bash
# Point the CLI at your own fork
expressots templates repo set mycompany/expressots-templates

# Team members automatically get company templates
expressots cicd generate github
```

## Documentation

For the full template syntax, directory structure, and contribution guide visit **[doc.expresso-ts.com](https://doc.expresso-ts.com)**.

## Contributing

See the [Contributing Guide](https://github.com/expressots/expressots/blob/main/CONTRIBUTING.md) for how to get involved.

## Support

- [GitHub Sponsors](https://github.com/sponsors/expressots)
- [Discord](https://discord.com/invite/PyPJfGK)
- [Report an Issue](https://github.com/expressots/expressots-cli/issues)

## License

MIT — see [LICENSE](./LICENSE.md).
