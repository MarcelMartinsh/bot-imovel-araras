const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const { gerarResposta, isQualificado } = require('./qualificador');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const sessions = {};

// Rota raiz para o Render validar a aplicação
app.get('/', (req, res) => {
  res.sendStatus(200);
});

// Rota webhook para receber mensagens da Z-API
app.post('/webhook', async (req, res) => {
  const { phone, message } = req.body;

  if (!message || !phone) {
    return res.status(400).send('Faltando dados.');
  }

  if (!sessions[phone]) {
    if (!message.toLowerCase().includes('interesse')) {
      await sendMessage(phone, 'Olá! Para começarmos, envie a palavra *interesse*.');
      return res.sendStatus(200);
    }
    sessions[phone] = [{ role: 'system', content: process.env.GPT_PROMPT }];
  }

  sessions[phone].push({ role: 'user', content: message });

  try {
    const resposta = await gerarResposta(sessions[phone]);
    sessions[phone].push({ role: 'assistant', content: resposta });

    await sendMessage(phone, resposta);

    if (isQualificado(resposta)) {
      await sendMessage(process.env.CORRETOR_PHONE, `Novo lead qualificado!\nWhatsApp: ${phone}\nResumo:\n${resposta}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Erro ao gerar resposta:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// Função de envio via Z-API
async function sendMessage(phone, message) {
  return axios.post(`${process.env.ZAPI_BASE_URL}/send-text`, {
    phone,
    message
  }, {
    headers: { 'Content-Type': 'application/json' }
  });
}

app.listen(port, () => {
  console.log(`🚀 Bot rodando na porta ${port}`);
});
