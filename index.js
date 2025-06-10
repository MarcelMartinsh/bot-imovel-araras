require('dotenv').config();
const express = require('express');
const gerarResposta = require('./qualificador');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Variáveis de ambiente
const TOKEN_ZAPI = process.env.ZAPI_TOKEN;
const ID_INSTANCIA = process.env.ZAPI_INSTANCE_ID;
const CORRETOR = process.env.CORRETOR_WHATSAPP;

// Mensagem-gatilho para iniciar o atendimento
const gatilho = "gostaria de mais informações sobre a casa de alto padrão em araras/sp, por favor.";

// Histórico de conversas por número
const historicos = {};

app.post('/webhook', async (req, res) => {
  const body = req.body;
  const mensagem = body.message?.text?.body || '';
  const numero = body.message?.from || '';

  if (!mensagem || !numero) {
    console.log("Requisição inválida");
    return res.sendStatus(400);
  }

  const mensagemFormatada = mensagem.trim().toLowerCase();

  // Aceita somente se for a mensagem exata, ou se já existe histórico
  if (mensagemFormatada !== gatilho && !historicos[numero]) {
    console.log("Mensagem fora do padrão ignorada");
    return res.sendStatus(200);
  }

  // Inicia histórico se for a primeira mensagem
  if (!historicos[numero]) historicos[numero] = [];

  // Adiciona mensagem do usuário
  historicos[numero].push({ role: "user", content: mensagem });

  try {
    const resposta = await gerarResposta(mensagem, historicos[numero]);
    historicos[numero].push({ role: "assistant", content: resposta });

    // Envia resposta ao cliente
    await axios.post(
      `https://api.z-api.io/instances/${ID_INSTANCIA}/token/${TOKEN_ZAPI}/send-text`,
      {
        phone: numero,
        message: resposta
      },
      {
        headers: {
          'Client-Token': TOKEN_ZAPI
        }
      }
    );

    // Encaminha ao corretor se lead parecer qualificado
    if (resposta.toLowerCase().includes("encaminhar") || resposta.toLowerCase().includes("ramon")) {
      await axios.post(
        `https://api.z-api.io/instances/${ID_INSTANCIA}/token/${TOKEN_ZAPI}/send-text`,
        {
          phone: CORRETOR,
          message: `📥 Novo lead qualificado:\n\nWhatsApp: ${numero}\n\nÚltima mensagem: "${mensagem}"`
        },
        {
          headers: {
            'Client-Token': TOKEN_ZAPI
          }
        }
      );
    }

    return res.sendStatus(200);
  } catch (erro) {
    console.error("Erro ao processar mensagem:", erro.message);
    return res.sendStatus(500);
  }
});

// Rota de teste
app.get('/', (req, res) => {
  res.send('Bot rodando na porta ' + PORT);
});

app.listen(PORT, () => {
  console.log(`Bot rodando na porta ${PORT}`);
});
