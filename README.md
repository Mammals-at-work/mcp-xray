# mcp-xray

Servidor MCP para interactuar con Xray Cloud y Xray Data Center usando TypeScript 5.

## Instalación

```bash
# Instalar dependencias
npm install

# Compilar el proyecto
npm run build
```

## Uso

Una vez compilado, ejecuta el servidor MCP:

```bash
node dist/index.js
```

El servidor se comunica mediante stdio (stdin/stdout) siguiendo el protocolo MCP, por lo que requiere ser invocado por un cliente MCP compatible.

## Funcionalidades iniciales

- Soporte para despliegues `cloud` y `datacenter`
- Autenticacion Xray Cloud mediante `client_id` y `client_secret`
- Autenticacion Jira para operaciones sobre Test Executions y Test Plans
- Tool MCP para validar conectividad con Xray/Jira
- Tool MCP para ejecutar consultas GraphQL en Xray Cloud
- Tool MCP para importar resultados de ejecucion a Xray
- Tools MCP para buscar, consultar y crear Test Executions
- Tools MCP para buscar, consultar y crear Test Plans
- Arquitectura modular orientada a testabilidad
- Suite de tests con cobertura automatizada

## Variables de entorno

### Cloud

```bash
XRAY_DEPLOYMENT=cloud
XRAY_CLIENT_ID=your-client-id
XRAY_CLIENT_SECRET=your-client-secret
XRAY_BASE_URL=https://xray.cloud.getxray.app
XRAY_TOKEN_TTL_SECONDS=3000
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your-jira-api-token
```

### Data Center

```bash
XRAY_DEPLOYMENT=datacenter
JIRA_BASE_URL=https://jira.example.com
JIRA_PAT=your-personal-access-token
# Alternativa:
# JIRA_USERNAME=your-user
# JIRA_PASSWORD=your-password
XRAY_BASE_URL=https://jira.example.com
XRAY_TOKEN_TTL_SECONDS=3000
```

## Integración con VSCode

Para usar este servidor MCP en VSCode con GitHub Copilot, agrega la siguiente configuración a tu archivo de settings MCP:

**Windows/Linux:** `%APPDATA%\Code\User\globalStorage\github.copilot-chat\mcp.json`  
**macOS:** `~/Library/Application Support/Code/User/globalStorage/github.copilot-chat/mcp.json`

```json
{
  "mcpServers": {
    "xray": {
      "command": "node",
      "args": [
        "/ruta/absoluta/a/mcp-xray/dist/index.js"
      ],
      "env": {
        "XRAY_DEPLOYMENT": "cloud",
        "XRAY_CLIENT_ID": "tu-client-id",
        "XRAY_CLIENT_SECRET": "tu-client-secret",
        "XRAY_BASE_URL": "https://xray.cloud.getxray.app",
        "XRAY_TOKEN_TTL_SECONDS": "3000",
        "JIRA_BASE_URL": "https://tu-dominio.atlassian.net",
        "JIRA_EMAIL": "tu@email.com",
        "JIRA_API_TOKEN": "tu-jira-api-token"
      }
    }
  }
}
```

Ajusta las variables de entorno según tu tipo de despliegue (cloud o datacenter). Una vez configurado, reinicia VSCode y el servidor MCP estará disponible para GitHub Copilot.

## Scripts

```bash
npm run dev
npm run build
npm test
```

## Notas

- `xray_graphql` esta pensado para Cloud.
- Las operaciones sobre Test Executions y Test Plans se apoyan en Jira REST porque estas entidades viven como issues en Jira/Xray.
- Para Data Center, la importacion usa la ruta clasica de Xray Server/Data Center bajo `/rest/raven/1.0`.