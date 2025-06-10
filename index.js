const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Carrega o token da Z-API do arquivo .env
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
console.log(`Z-API Token carregado: ${ZAPI_TOKEN}`);

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  try {
    console.log('📨 Requisição recebida no /webhook:');
    console.log(JSON.stringify(req.body, null, 2));

    const mensagem = req.body?.text?.message;
    const numero = req.body?.phone;

    if (!mensagem || !numero) {
      console.log('❌ Mensagem ou número ausente. Ignorando.');
      return res.sendStatus(400);
    }

    const gatilho = "Gostaria de mais informações sobre a casa de Alto Padrão em Araras/SP, por favor.";

    if (mensagem.trim() === gatilho) {
      const resposta = "Olá! Obrigado pelo seu interesse na casa de Alto Padrão em Araras/SP. Posso te fazer algumas perguntas rápidas para entender melhor seu perfil?";
      await enviarMensagem(numero, resposta);
    } else {
      console.log('⚠️ Gatilho não reconhecido. Ignorando a mensagem.');
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error.message);
    res.sendStatus(500);
  }
});

async function enviarMensagem(numero, mensagem) {
  try {
    const url = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-messages`;
    const payload = {
      phone: numero,
      message: mensagem,
    };

    const response = await axios.post(url, payload);
    console.log('✅ Mensagem enviada com sucesso:', response.data);
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.message);
  }
}

app.get('/', (req, res) => {
  res.send('Bot está rodando!');
});

app.listen(port, () => {
  console.log(`🚀 Bot rodando na porta ${port}`);
});
