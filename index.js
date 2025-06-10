const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Função para enviar mensagem usando Z-API
async function enviarMensagem(numero, mensagem) {
  const payload = {
    phone: numero,
    message: mensagem
  };

  console.log('🔄 Enviando mensagem para:', numero);
  console.log('📦 Payload:', payload);

  try {
    const response = await axios.post(
      `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': process.env.ZAPI_TOKEN // se Z-API exigir esse cabeçalho
        }
      }
    );

    console.log('✅ Mensagem enviada com sucesso:', response.data);
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
  }
}

// Webhook que recebe a mensagem do WhatsApp
app.post('/webhook', async (req, res) => {
  try {
    console.log('📨 Requisição recebida no /webhook:');
    console.log(JSON.stringify(req.body, null, 2));

    const mensagem = req.body?.message?.text?.body;
    const numero = req.body?.message?.from;

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

app.get('/', (req, res) => {
  res.send('Bot ativo.');
});

app.listen(PORT, () => {
  console.log(`🚀 Bot rodando na porta ${PORT}`);
});
