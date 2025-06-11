
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const { gerarResposta, isQualificado } = require('./qualificador');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const sessions = {};

app.get('/', (req, res) => {
  res.sendStatus(200);
});

app.post('/webhook', async (req, res) => {
  console.log('📩 Requisição recebida no /webhook:', JSON.stringify(req.body));

  const phone = req.body.phone;
  const message = req.body.text?.message;

  if (!message || !phone) {
    console.warn('⚠️ Requisição malformada:', req.body);
    return res.status(400).send('Faltando dados.');
  }

  if (!sessions[phone]) {
    if (!message.toLowerCase().includes('interesse')) {
      await sendMessage(phone, 'Olá! Para começarmos, envie a palavra *interesse*.');
      return res.sendStatus(200);
    }

    sessions[phone] = [{ role: 'system', content: process.env.GPT_PROMPT }];
    console.log(`🤖 Nova sessão iniciada para ${phone}`);
  }

  sessions[phone].push({ role: 'user', content: message });

  try {
    const resposta = await gerarResposta(sessions[phone]);
    sessions[phone].push({ role: 'assistant', content: resposta });

    await sendMessage(phone, resposta);

    if (isQualificado(resposta)) {
      console.log(`✅ Lead qualificado detectado: ${phone}`);
      await sendMessage(
        process.env.CORRETOR_PHONE,
        `📥 *Novo lead qualificado!*
WhatsApp: ${phone}
Resumo:
${resposta}`
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro ao gerar resposta:', err.message);
    await sendMessage(phone, '⚠️ Ocorreu um erro ao processar sua mensagem. Tente novamente em instantes.');
    res.sendStatus(500);
  }
});

async function sendMessage(phone, message) {
  try {
    const url = process.env.ZAPI_BASE_URL;
    const response = await axios.post(url, {
      phone,
      message
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`📤 Mensagem enviada para ${phone}: ${message}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Erro ao enviar mensagem para ${phone}:`, error.response?.data || error.message);
  }
}

app.listen(port, () => {
  console.log(`🚀 Bot rodando na porta ${port}`);
});
