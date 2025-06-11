const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const { gerarResposta } = require('./qualificador');

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
  const message = req.body.text?.message?.trim();

  if (!phone || !message) {
    return res.status(400).send('Faltando dados.');
  }

  // Inicializa sessão se não existir
  if (!sessions[phone]) {
    if (!message.toLowerCase().includes('interesse')) {
      await sendMessage(phone, 'Olá! Para começarmos, envie a palavra *interesse*.');
      return res.sendStatus(200);
    }

    sessions[phone] = {
      etapa: 1,
      nome: '',
      visita: '',
      pagamento: '',
      encaminhar: false,
      bloqueado: false,
      historico: [{ role: 'system', content: process.env.GPT_PROMPT }]
    };

    await sendMessage(phone, 'Ótimo! Por favor, poderia me informar seu nome?');
    return res.sendStatus(200);
  }

  const sessao = sessions[phone];

  // Anti-spam: ignora se já estiver processando
  if (sessao.bloqueado) {
    console.log(`⏳ Ignorado: sessão de ${phone} está em andamento.`);
    return res.sendStatus(200);
  }

  sessao.bloqueado = true;

  try {
    switch (sessao.etapa) {
      case 1:
        sessao.nome = message;
        sessao.etapa = 2;
        await sendMessage(phone, 'Obrigado! Você gostaria de fazer uma visita ao imóvel?');
        break;

      case 2:
        sessao.visita = message;
        sessao.etapa = 3;
        await sendMessage(phone, 'Como pretende realizar o pagamento? Financiado ou à vista?');
        break;

      case 3:
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

        // Etapa para confirmar envio ao corretor
        await sendMessage(phone, 'Deseja que eu encaminhe essas informações ao corretor? Responda com *sim* ou *não*.');
        sessao.etapa = 5;
        break;

      case 5:
        if (message.toLowerCase().includes('sim')) {
          await sendMessage(
            process.env.CORRETOR_PHONE,
            `📥 *Novo lead qualificado!*\nWhatsApp: ${phone}\nResumo:\nNome: ${sessao.nome}\nVisita: ${sessao.visita}\nPagamento: ${sessao.pagamento}`
          );
          await sendMessage(phone, '✅ Lead encaminhado com sucesso ao corretor.');
          sessao.etapa = 6;
        } else {
          await sendMessage(phone, 'Ok! Não enviarei ao corretor. Se precisar, estou à disposição.');
          sessao.etapa = 6;
        }
        break;

      default:
        await sendMessage(phone, 'Se desejar reiniciar, envie a palavra *interesse* novamente.');
        break;
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro ao processar:', err.message);
    await sendMessage(phone, '⚠️ Ocorreu um erro. Tente novamente mais tarde.');
    res.sendStatus(500);
  } finally {
    sessao.bloqueado = false;
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
