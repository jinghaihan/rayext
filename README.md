<h1 align="center"><samp><b>rayext</b></samp></h1>

<p align="center">A decentralized extension manager for Raycast that pulls directly from Github repositories</p>

[![npm version][npm-version-src]][npm-version-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

```sh
npx rayext <author>/<repo> [<options>]
npx rayext <author>/<repo>@<tag> [<options>]
```

- 📦 <samp><b>Install extensions</samp></b> - directly from any GitHub repository
- 📋 <samp><b>List installed extensions</samp></b> - with version
- 🔍 <samp><b>View extension details</samp></b> - check metadata and info
- 🔄 <samp><b>Update extensions</samp></b> - upgrade via repository tags
- 🗑️ <samp><b>Uninstall extensions</samp></b> - remove from local system

<div align="center">
  <img src="/assets/install.gif" alt="dark" width="45%">
  <img src="/assets/help.png" alt="light" width="50%">
</div>

## Monorepo

For repositories containing multiple extensions or packages, use the `--package` option to specify the path to the specific extension package:

```sh
npx rayext <author>/<repo> --package 'packages/extension'
```

## GitHub Token

GitHub API has rate limits. For high-frequency usage, it's recommended to provide a token parameter or configure the `GITHUB_TOKEN` environment variable:

```sh
# Using token parameter
npx rayext <author>/<repo> --token <token>

# Or set environment variable
export GITHUB_TOKEN=<token>
npx rayext <author>/<repo>
```

## Why ?

Raycast extensions must be published to the [official repository](https://github.com/raycast/extensions), which creates challenges:

- All extensions go through one massive repository with thousands of contributors
- Issues and maintenance become difficult to track
- Developers lose control over their extension lifecycle
- Slow centralized review process

`rayext` provides a **decentralized alternative** - install extensions directly from any GitHub repository, giving developers full control and users direct access to more extensions.

## License

[MIT](./LICENSE) License © [jinghaihan](https://github.com/jinghaihan)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/rayext?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/rayext
[npm-downloads-src]: https://img.shields.io/npm/dm/rayext?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/rayext
[bundle-src]: https://img.shields.io/bundlephobia/minzip/rayext?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=rayext
[license-src]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/jinghaihan/rayext/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/rayext
