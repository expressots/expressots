<div align="center">
  <a href="https://expresso-ts.com">
    <img src="https://github.com/expressots/expressots/blob/main/media/expressots.png" alt="ExpressoTS" width="120">
  </a>

  <h1>ExpressoTS Templates</h1>

  <p>Community-maintained templates for CI/CD, Docker, Kubernetes, and cloud migrations. Consumed by the ExpressoTS CLI.</p>

  <p>
    <a href="https://github.com/expressots/templates/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/expressots/templates?style=flat-square&color=181717" alt="License"></a>
    <a href="https://discord.com/invite/PyPJfGK"><img src="https://img.shields.io/badge/Discord-join-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord"></a>
    <a href="https://github.com/expressots/templates/actions"><img src="https://img.shields.io/github/actions/workflow/status/expressots/templates/build.yml?branch=main&style=flat-square&logo=github&label=build" alt="Build"></a>
  </p>

  <p>
    <a href="https://doc.expresso-ts.com">Documentation</a> ·
    <a href="https://doc.expresso-ts.com/docs/cli/overview">CLI Reference</a> ·
    <a href="https://github.com/orgs/expressots/projects/5">Project Board</a> ·
    <a href="https://discord.com/invite/PyPJfGK">Community</a>
  </p>
</div>

---

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

## Documentation

For guides, API reference, architecture patterns, and examples visit **[doc.expresso-ts.com](https://doc.expresso-ts.com)**.

## Contributing

Welcome to the ExpressoTS community. See the [Contributing Guide](https://github.com/expressots/expressots/blob/main/CONTRIBUTING.md) for how to get involved.

## Support the project

- [GitHub Sponsors](https://github.com/sponsors/expressots)
- [Star the organization](https://github.com/expressots) on GitHub
- [Discord](https://discord.com/invite/PyPJfGK)
- [Report an issue](https://github.com/expressots/templates/issues)

## License

MIT. See [LICENSE](./LICENSE.md).

