
# Bot de Qualificação de Lead – Imóvel em Araras

Este bot usa a Z-API e o ChatGPT para qualificar leads automaticamente via WhatsApp e encaminhá-los ao corretor responsável.

## Como rodar

1. Crie um projeto no Railway ou instale localmente.
2. Configure as variáveis do arquivo `.env` usando o exemplo `.env.example`.
3. Instale dependências:
   npm install
4. Inicie:
   npm start

O bot escuta requisições no endpoint `/webhook`.

Recomendado: configurar webhook na Z-API para esse endpoint.
