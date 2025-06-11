
# Bot WhatsApp Imóvel - Atendimento com GPT e Z-API

Este bot automatiza o atendimento de leads via WhatsApp, usando a Z-API como gateway e o ChatGPT para qualificação.

## Funcionalidades
- Atende leads automaticamente
- Ativa qualificação com a palavra-chave: **interesse**
- Usa inteligência do ChatGPT para dialogar e qualificar
- Encaminha leads qualificados para o corretor no WhatsApp

## Instalação

1. Instale as dependências:
\`\`\`
npm install
\`\`\`

2. Crie um arquivo `.env` baseado em `.env.example`

3. Rode localmente:
\`\`\`
npm start
\`\`\`

Ou publique no Render para manter online.

## Variáveis de ambiente

- \`OPENAI_API_KEY\`: sua chave da OpenAI
- \`ZAPI_BASE_URL\`: endpoint completo da Z-API (com token)
- \`CORRETOR_PHONE\`: número do corretor no formato internacional
- \`GPT_PROMPT\`: instrução de base para o GPT

---

Este bot foi gerado automaticamente para atender exclusivamente o imóvel à venda em Araras/SP.
