require('dotenv').config();
const express = require('express');
const gerarResposta = require('./qualificador');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TOKEN_ZAPI = process.env.ZAPI_TOKEN;
const ID_INSTANCIA = process.env.ZAPI_INSTANCE_ID;
const NUMERO_CORRETOR = process.env.NUMERO_CORRETOR; // formato: 5511999999999

// MENSAGEM GATILHO
const gatilho = "Gostaria de mais informações sobre a casa de Alto Padrão em Araras/SP, por favor.";

const historicos = {};

app.post('/webhook', async (req, res) => {
  const body = req.body;
  const mensagem = body.message?.text?.body || "";
  const numero = body.message?.from || "";

  if (mensagem !== gatilho && !historicos[numero]) {
    return res.sendStatus(200); // Ignora mensagens fora do padrão inicial
  }

  if (!historicos[numero]) historicos[numero] = [];

  historicos[numero].push({ role: "user", content: mensagem });

  const resposta = await gerarResposta(mensagem, historicos[numero]);

  historicos[numero].push({ role: "assistant", content: resposta });

  // Envia resposta ao WhatsApp
  await axios.post(`https://api.z-api.io/instances/${ID_INSTANCIA}/token/${TOKEN_ZAPI}/send-text`, {
    phone: numero,
    message: resposta
  });

  // Encaminha ao corretor se lead parecer qualificado
  if (resposta.toLowerCase().includes("encaminhar") || resposta.toLowerCase().includes("ramon")) {
    await axios.post(`https://api.z-api.io/instances/${ID_INSTANCIA}/token/${TOKEN_ZAPI}/send-text`, {
      phone: NUMERO_CORRETOR,
      message: `Lead qualificado: \n${numero} \n\nÚltima mensagem:\n"${mensagem}"`
    });
  }

  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('Bot rodando na porta ' + PORT);
});

app.listen(PORT, () => {
  console.log(`Bot rodando na porta ${PORT}`);
});
