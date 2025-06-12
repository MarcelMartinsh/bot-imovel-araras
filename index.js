const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const { gerarResposta } = require('./qualificador');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Sessões por telefone
const sessions = {};

// Health check
app.get('/', (req, res) => {
  res.sendStatus(200);
});

// Webhook Z-API
app.post('/webhook', async (req, res) => {
  console.log('📩 Requisição recebida no /webhook:', JSON.stringify(req.body));

  const phone = req.body.phone;
  const message = req.body.text?.message?.trim();

  if (!message || !phone) {
    return res.status(400).send('Faltando dados.');
  }

  // Sessão inexistente: só inicia se digitar "interesse"
  if (!sessions[phone]) {
    if (message.toLowerCase() !== 'interesse') {
      await sendMessage(phone, 'Olá! Para começarmos, envie a palavra *interesse*.');
      return res.sendStatus(200);
    }

    sessions[phone] = {
      etapa: 1,
      nome: '',
      visita: '',
      pagamento: '',
      desejaContato: '',
      historico: [{ role: 'system', content: process.env.GPT_PROMPT }]
    };

    await sendMessage(phone, 'Ótimo! Por favor, poderia me informar seu nome?');
    return res.sendStatus(200);
  }

  const sessao = sessions[phone];

  try {
    if (sessao.etapa === 1) {
      sessao.nome = message;
      sessao.etapa = 2;
      await sendMessage(phone, 'Obrigado! Você gostaria de fazer uma visita ao imóvel?');
    } else if (sessao.etapa === 2) {
      sessao.visita = message;
      sessao.etapa = 3;
      await sendMessage(phone, 'Como pretende realizar o pagamento? Financiado ou à vista?');
    } else if (sessao.etapa === 3) {
      sessao.pagamento = message;
      sessao.etapa = 4;

      const resumo = `
Nome: ${sessao.nome}
Deseja visita: ${sessao.visita}
Forma de pagamento: ${sessao.pagamento}
      `.trim();

      sessao.historico.push({ role: 'user', content: resumo });

      const resposta = await gerarResposta(sessao.historico);
      sessao.historico.push({ role: 'assistant', content: resposta });

      await sendMessage(phone, resposta);
      await sendMessage(phone, 'Deseja que eu encaminhe suas informações para o corretor responsável? (responda com *sim* ou *não*)');
    } else if (sessao.etapa === 4) {
      const confirmacao = message.toLowerCase();
      if (confirmacao.includes('sim')) {
        sessao.etapa = 5;

        await sendMessage(process.env.CORRETOR_PHONE,
          `📥 *Novo lead qualificado!*\nWhatsApp: ${phone}\nNome: ${sessao.nome}\nVisita: ${sessao.visita}\nPagamento: ${sessao.pagamento}`
        );

        await sendMessage(phone, '✅ Seus dados foram encaminhados ao corretor. Ele entrará em contato em breve.');
      } else {
        sessao.etapa = 5;
        await sendMessage(phone, 'Tudo bem! Se mudar de ideia, é só escrever *interesse* novamente.');
      }
    } else {
      await sendMessage(phone, 'Agradecemos seu contato. Se precisar de mais informações, envie *interesse* para reiniciar.');
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro ao processar:', err.message);
    await sendMessage(phone, '⚠️ Ocorreu um erro. Tente novamente mais tarde.');
    res.sendStatus(500);
  }
});

async function sendMessage(phone, message) {
  try {
    const url = `${process.env.ZAPI_BASE_URL}/send-text`;
    const response = await axios.post(
      url,
      { phone, message },
      {
        headers: {
          'Content-Type': 'application/json',
          'client-token': process.env.ZAPI_CLIENT_TOKEN
        }
      }
    );
    console.log(`📤 Mensagem enviada para ${phone}: ${message}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Erro ao enviar mensagem para ${phone}:`, error.response?.data || error.message);
  }
}

app.listen(port, () => {
  console.log(`🚀 Bot rodando na porta ${port}`);
});
