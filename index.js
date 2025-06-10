const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;

app.post('/webhook', async (req, res) => {
  console.log('📨 Requisição recebida no /webhook:');
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const phone = req.body.phone || req.body.message?.from;
    const mensagem = req.body.text?.message || req.body.message?.text?.body;

    if (!phone || !mensagem) {
      console.log('❌ Mensagem ou número ausente. Ignorando.');
      return res.sendStatus(400);
    }

    const resposta = `Olá! Recebemos sua mensagem: "${mensagem}". Em breve um corretor entrará em contato.`;

    await axios.post(`https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-messages`, {
      phone: phone,
      message: resposta
    });

    console.log('✅ Mensagem enviada com sucesso.');
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot rodando na porta ${PORT}`);
});
