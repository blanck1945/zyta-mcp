# Publicar en npm

El paquete se publica en **npm público** como `zyta-mcp` (cualquiera puede `npx -y zyta-mcp`).

## Opción A — desde tu máquina (una vez)

```bash
cd Zyta-mcp
npm login --registry https://registry.npmjs.org
npm publish --registry https://registry.npmjs.org --access public
```

Verificá:

```bash
npm view zyta-mcp version --registry https://registry.npmjs.org
```

## Opción B — GitHub Actions (recomendado para releases)

1. Creá un [token de automatización en npmjs.com](https://www.npmjs.com/settings/~youruser/tokens) (tipo **Automation**).
2. Guardalo en el repo:

```bash
gh secret set NPM_TOKEN --repo blanck1945/zyta-mcp
```

3. Publicá creando un release en GitHub, o manualmente:

```bash
gh workflow run publish.yml --repo blanck1945/zyta-mcp
```

## Bump de versión

Editá `version` en `package.json`, commit, tag y release:

```bash
npm version patch
git push && git push --tags
gh release create v1.0.1 --generate-notes
```
