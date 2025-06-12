const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const { gerarResposta, isRespostaValida } = require('./qualificador');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const sessions = {};
const GATILHO = 'olá, gostaria de falar sobre o imóvel do jardim universitário, de araras/sp.';

app.get('/', (req, res) => {
  res.sendStatus(200);
});

app.post('/webhook', async (req, res) => {
  console.log('📩 Recebido:', JSON.stringify(req.body));

  const phone = req.body.phone;
  const message = req.body.text?.message?.trim();

  if (!phone || !message) return res.sendStatus(400);

  const msg = message.toLowerCase();

  // Se não há sessão ativa e mensagem não é o gatilho, ignore silenciosamente
  if (!sessions[phone] && msg !== GATILHO) return res.sendStatus(200);

  // Inicia nova sessão com a mensagem de gatilho
  if (!sessions[phone]) {
    sessions[phone] = {
      etapa: 1,
      nome: '',
      visita: '',
      pagamento: '',
      autorizouEnvio: false
    };
    await sendMessage(phone, 'Ótimo! Para começarmos, por favor, qual é o seu nome?');
    return res.sendStatus(200);
  }

  const sessao = sessions[phone];

  try {
    if (sessao.etapa === 1) {
      if (!(await isRespostaValida('nome', message))) {
        await sendMessage(phone, 'Desculpe, não entendi seu nome. Pode repetir?');
        return res.sendStatus(200);
      }

      sessao.nome = message;
      sessao.etapa = 2;
      await sendMessage(phone, 'Perfeito! Você gostaria de agendar uma visita ao imóvel?');
      return res.sendStatus(200);
    }

    if (sessao.etapa === 2) {
      if (!(await isRespostaValida('visita', message))) {
        await sendMessage(phone, 'Só confirmando, você deseja visitar o imóvel?');
        return res.sendStatus(200);
      }

      sessao.visita = message;
      sessao.etapa = 3;
      await sendMessage(phone, 'Como você pretende pagar? À vista ou financiado?');
      return res.sendStatus(200);
    }

    if (sessao.etapa === 3) {
      if (!(await isRespostaValida('pagamento', message))) {
        await sendMessage(phone, 'Poderia informar se será à vista ou financiado?');
        return res.sendStatus(200);
      }

      sessao.pagamento = message;
      sessao.etapa = 4;
      await sendMessage(phone, 'Deseja que eu envie essas informações ao corretor para contato direto? (sim ou não)');
      return res.sendStatus(200);
    }

    if (sessao.etapa === 4) {
      if (msg.includes('sim')) {
        sessao.autorizouEnvio = true;
        const resumo = `Nome: ${sessao.nome}\nVisita: ${sessao.visita}\nPagamento: ${sessao.pagamento}`;
        await sendMessage(
          process.env.CORRETOR_PHONE,
          `📥 *Novo lead qualificado!*\nWhatsApp: ${phone}\nResumo:\n${resumo}`
        );
        await sendMessage(phone, '✅ Informações enviadas ao corretor. Ele entrará em contato em breve!');
      } else {
        await sendMessage(phone, 'Ok! Se quiser retomar depois, estou por aqui.');
      }

      sessao.etapa = 99; // conversa encerrada
      return res.sendStatus(200);
    }

    // Etapa 99: não fazer mais nada
    return res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    await sendMessage(phone, '⚠️ Houve um erro. Tente novamente em instantes.');
    return res.sendStatus(500);
  }
});

async function sendMessage(phone, message) {
  try {
    const url = `${process.env.ZAPI_BASE_URL}/send-text`;
    await axios.post(
      url,
      { phone, message },
      {
        headers: {
          'Content-Type': 'application/json',
          'client-token': process.env.ZAPI_CLIENT_TOKEN,
        }
      }
    );
    console.log(`📤 Enviado para ${phone}: ${message}`);
  } catch (error) {
    console.error(`❌ Erro ao enviar para ${phone}:`, error.response?.data || error.message);
  }
}

app.listen(port, () => {
  console.log(`🚀 Bot rodando na porta ${port}`);
});
