const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const sessions = {};

app.get('/', (req, res) => {
  res.sendStatus(200);
});

app.post('/webhook', async (req, res) => {
  const phone = req.body.phone;
  const message = req.body.text?.message?.trim();

  if (!message || !phone) return res.status(400).send('Faltando dados.');

  const gatilho = "olá, gostaria de falar sobre o imóvel do jardim universitário, de araras/sp.";

  if (!sessions[phone]) {
    if (message.toLowerCase() !== gatilho) {
      console.log(`Mensagem ignorada de ${phone}: ${message}`);
      return res.sendStatus(200);
    }

    sessions[phone] = {
      etapa: 1,
      nome: '',
      visita: '',
      pagamento: '',
      desejaEncaminhar: false
    };

    await sendMessage(phone, "Ótimo! Para começarmos, qual é o seu nome, por favor?");
    return res.sendStatus(200);
  }

  const sessao = sessions[phone];

  try {
    if (sessao.etapa === 1) {
      sessao.nome = message;
      sessao.etapa = 2;
      await sendMessage(phone, "Obrigado, " + sessao.nome + "! Você gostaria de agendar uma visita ao imóvel?");
    } else if (sessao.etapa === 2) {
      sessao.visita = message;
      sessao.etapa = 3;
      await sendMessage(phone, "Entendi! E como pretende pagar o imóvel? Financiamento ou à vista?");
    } else if (sessao.etapa === 3) {
      sessao.pagamento = message;
      sessao.etapa = 4;
      await sendMessage(phone, "Deseja que eu encaminhe sua mensagem ao corretor responsável pelo imóvel? (Responda com SIM ou NÃO)");
    } else if (sessao.etapa === 4) {
      if (message.toLowerCase().includes("sim")) {
        sessao.desejaEncaminhar = true;
        await sendMessage(
          process.env.CORRETOR_PHONE,
          `📥 *Novo lead qualificado!*\nWhatsApp: ${phone}\nResumo:\nNome: ${sessao.nome}\nVisita: ${sessao.visita}\nPagamento: ${sessao.pagamento}`
        );
        await sendMessage(phone, "Perfeito! Encaminhei suas informações ao corretor. Ele entrará em contato em breve.");
      } else {
        await sendMessage(phone, "Tudo bem! Se mudar de ideia, é só me avisar.");
      }
      sessao.etapa = 5; // fim
    } else {
      await sendMessage(phone, "Caso tenha mais dúvidas sobre o imóvel, estou à disposição.");
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro ao processar mensagem:", err.message);
    await sendMessage(phone, "⚠️ Ocorreu um erro. Por favor, tente novamente em instantes.");
    res.sendStatus(500);
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
          'client-token': process.env.ZAPI_CLIENT_TOKEN
        }
      }
    );
    console.log(`📤 Mensagem enviada para ${phone}: ${message}`);
  } catch (err) {
    console.error(`Erro ao enviar mensagem para ${phone}:`, err.response?.data || err.message);
  }
}

app.listen(port, () => {
  console.log(`🚀 Bot rodando na porta ${port}`);
});
