# mcp-xray

Servidor MCP para interactuar con Xray Cloud de Atlassian usando TypeScript 5.

## Funcionalidades iniciales

- Autenticacion con Xray Cloud mediante `client_id` y `client_secret`
- Tool MCP para validar conectividad con Xray
- Tool MCP para ejecutar consultas GraphQL en Xray
- Tool MCP para importar resultados de ejecucion a Xray
- Arquitectura modular orientada a testabilidad
- Suite de tests con cobertura automatizada

## Variables de entorno

```bash
XRAY_CLIENT_ID=your-client-id
XRAY_CLIENT_SECRET=your-client-secret
XRAY_BASE_URL=https://xray.cloud.getxray.app
XRAY_TOKEN_TTL_SECONDS=3000
```

## Scripts

```bash
npm run dev
npm run build
npm test
```