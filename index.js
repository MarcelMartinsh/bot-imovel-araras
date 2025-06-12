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

  const gatilho = 'olá, gostaria de falar sobre o imóvel do jardim universitário, de araras/sp.';

  if (!message || !phone) return res.sendStatus(400);

  // Só inicia conversa se a mensagem for exatamente o gatilho
  if (!sessions[phone]) {
    if (message.toLowerCase() !== gatilho) return res.sendStatus(200);

    sessions[phone] = {
      etapa: 1,
      historico: [
        { role: 'system', content: process.env.GPT_PROMPT },
        { role: 'user', content: message }
      ],
      nome: '',
      visita: '',
      pagamento: '',
      aguardando: true
    };

    await sendMessage(phone, 'Olá! Para começarmos, por favor me informe seu nome completo.');
    return res.sendStatus(200);
  }

  const sessao = sessions[phone];
  if (!sessao.aguardando) return res.sendStatus(200);

  try {
    if (sessao.etapa === 1) {
      sessao.nome = message;
      sessao.etapa = 2;
      sessao.aguardando = true;
      await sendMessage(phone, 'Obrigado! Gostaria de agendar uma visita ao imóvel?');

    } else if (sessao.etapa === 2) {
      sessao.visita = message;
      sessao.etapa = 3;
      sessao.aguardando = true;
      await sendMessage(phone, 'Certo! E pretende pagar à vista ou via financiamento?');

    } else if (sessao.etapa === 3) {
      sessao.pagamento = message;
      sessao.etapa = 4;
      sessao.aguardando = true;

      const resumo = `Nome: ${sessao.nome}\nVisita: ${sessao.visita}\nPagamento: ${sessao.pagamento}`;
      sessao.historico.push({ role: 'user', content: resumo });

      const resposta = await gerarResposta(sessao.historico);
      sessao.historico.push({ role: 'assistant', content: resposta });

      await sendMessage(phone, resposta);
      await sendMessage(phone, 'Deseja que eu encaminhe seu interesse ao corretor responsável? Responda "Sim" ou "Não".');

    } else if (sessao.etapa === 4) {
      if (message.toLowerCase().includes('sim')) {
        await sendMessage(
          process.env.CORRETOR_PHONE,
          `📥 *Novo lead qualificado!*
WhatsApp: ${phone}
Nome: ${sessao.nome}
Visita: ${sessao.visita}
Pagamento: ${sessao.pagamento}`
        );
        await sendMessage(phone, 'Seu contato foi encaminhado ao corretor. Ele entrará em contato em breve.');
      } else {
        await sendMessage(phone, 'Ok, não encaminharemos seu contato por enquanto. Se mudar de ideia, é só avisar.');
      }
      sessao.etapa = 5;
    }
  } catch (err) {
    console.error('❌ Erro ao processar:', err.message);
    await sendMessage(phone, '⚠️ Ocorreu um erro. Tente novamente mais tarde.');
  }

  sessao.aguardando = true;
  res.sendStatus(200);
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
          'client-token': process.env.ZAPI_CLIENT_TOKEN,
        },
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
