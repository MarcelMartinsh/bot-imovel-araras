const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const { gerarResposta, isQualificado } = require('./qualificador');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const sessions = {};
const GATILHO = 'olá, gostaria de falar sobre o imóvel do jardim universitário, de araras/sp.';

app.get('/', (req, res) => {
  res.sendStatus(200);
});

app.post('/webhook', async (req, res) => {
  console.log('📩 Requisição recebida no /webhook:', JSON.stringify(req.body));

  const phone = req.body.phone;
  const message = req.body.text?.message?.trim();

  if (!message || !phone) {
    return res.status(400).send('Faltando dados.');
  }

  const msg = message.toLowerCase();
  const sessao = sessions[phone];

  if (!sessao) {
    if (msg === GATILHO) {
      sessions[phone] = {
        etapa: 1,
        nome: '',
        visita: '',
        pagamento: '',
        autorizacao: '',
        historico: [{ role: 'system', content: process.env.GPT_PROMPT }]
      };
      await sendMessage(phone, 'Ótimo! Por favor, poderia me informar seu nome?');
    } else {
      await sendMessage(phone, 'Olá! Para iniciarmos, envie a mensagem exata: "Olá, gostaria de falar sobre o imóvel do Jardim Universitário, de Araras/SP."');
    }
    return res.sendStatus(200);
  }

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
      const resumo = `Nome: ${sessao.nome}\nDeseja visita: ${sessao.visita}\nForma de pagamento: ${sessao.pagamento}`;
      sessao.historico.push({ role: 'user', content: resumo });
      const resposta = await gerarResposta(sessao.historico);
      sessao.historico.push({ role: 'assistant', content: resposta });
      await sendMessage(phone, resposta);
      sessao.etapa = 5;
      await sendMessage(phone, 'Deseja que eu encaminhe seu contato ao corretor responsável por este imóvel? Responda SIM para autorizar ou NÃO para encerrar.');
    } else if (sessao.etapa === 5) {
      if (msg.includes('sim')) {
        sessao.etapa = 6;
        await sendMessage(
          process.env.CORRETOR_PHONE,
          `📥 *Novo lead qualificado!*
WhatsApp: ${phone}
Nome: ${sessao.nome}
Visita: ${sessao.visita}
Pagamento: ${sessao.pagamento}`
        );
        await sendMessage(phone, 'Perfeito! Seus dados foram encaminhados ao corretor. Ele entrará em contato em breve.');
      } else {
        await sendMessage(phone, 'Tudo bem, não encaminharei suas informações. Caso precise, estarei por aqui.');
        delete sessions[phone];
      }
    } else {
      await sendMessage(phone, 'Se desejar reiniciar o atendimento, por favor, envie novamente a mensagem inicial.');
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
