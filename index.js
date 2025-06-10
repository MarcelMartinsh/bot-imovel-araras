const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const INSTANCE_ID = '3E25D92604A4304948AE06E9A5181015'; // substitua se necessário
const TOKEN = '7CCF4CA1D28B3807703B71A8'; // substitua se necessário

app.get('/', (req, res) => {
  res.send('🤖 Bot Imóvel Araras ativo!');
});

app.post('/webhook', async (req, res) => {
  const payload = req.body;
  console.log('📨 Requisição recebida no /webhook:\n', payload);

  // Ignora mensagens enviadas pelo próprio número ou vazias
  if (payload.fromMe || !payload.text || !payload.text.message) {
    console.log('🔕 Mensagem ignorada (do próprio número ou sem texto).');
    return res.sendStatus(200);
  }

  const userMessage = payload.text.message;
  const phone = payload.phone || payload.chatLid;

  // Resposta fixa – pode trocar por integração com GPT se quiser
  const respostaFinal = 
`Claro, com prazer! 

A casa de Alto Padrão localizada em Araras/SP destaca-se por sua ampla metragem e acabamentos de excelente qualidade. Possui 4 suítes arejadas e confortáveis, cuja iluminação natural é incrível, além de oferecer uma vista espetacular da cidade. A cozinha é completamente equipada, o que certamente enriquecerá suas experiências culinárias. Além disso, o imóvel oferece um espaço de lazer com piscina e churrasqueira, ideal para momentos com a família e amigos.

Para mais informações como valor, condições de pagamento ou agendamento de visitas, entre em contato diretamente com o corretor Ramon Guiral via WhatsApp: (19) 99990-2492. Ele terá o prazer em te atender!`;

  try {
    console.log(`💬 Enviando resposta para ${phone}: ${respostaFinal}`);

    const resposta = await axios.post(
      `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-messages`,
      {
        phone: phone,
        message: respostaFinal,
      }
    );

    console.log('✅ Mensagem enviada com sucesso.', resposta.data);
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Bot rodando na porta ${PORT}`);
});
