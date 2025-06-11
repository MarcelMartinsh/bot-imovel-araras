const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const { gerarResposta, isQualificado } = require('./qualificador');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Sessões por telefone
const sessions = {};

// 🔁 Rota raiz para health check do Render
app.get('/', (req, res) => {
  res.sendStatus(200);
});

// 🔁 Webhook Z-API
app.post('/webhook', async (req, res) => {
  const { phone, message } = req.body;

  if (!message || !phone) {
    return res.status(400).send('Faltando dados.');
  }

  // Gatilho de início: só ativa se a palavra "interesse" estiver na primeira mensagem
  if (!sessions[phone]) {
    if (!message.toLowerCase().includes('interesse')) {
      await sendMessage(phone, 'Olá! Para começarmos, envie a palavra *interesse*.');
      return res.sendStatus(200);
    }

    // Inicia a conversa com o prompt de sistema
    sessions[phone] = [{ role: 'system', content: process.env.GPT_PROMPT }];
  }

  // Continua o histórico da sessão
  sessions[phone].push({ role: 'user', content: message });

  try {
    // Chama o ChatGPT
    const resposta = await gerarResposta(sessions[phone]);

    // Adiciona resposta no histórico
    sessions[phone].push({ role: 'assistant', content: resposta });

    // Envia resposta ao lead
    await sendMessage(phone, resposta);

    // Se estiver qualificado, envia aviso ao corretor
    if (isQualificado(resposta)) {
      await sendMessage(process.env.CORRETOR_PHONE, `📥 *Novo lead qualificado!*\nWhatsApp: ${phone}\nResumo:\n${resposta}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Erro ao gerar resposta:', err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// 🔁 Função de envio de mensagens via Z-API
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
