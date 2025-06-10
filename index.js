
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { gerarRespostaQualificacao, leadEstaQualificado, extrairDadosLead } = require('./qualificador');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const corretorWhatsApp = process.env.CORRETOR_WHATSAPP;

app.post('/webhook', async (req, res) => {
    const mensagem = req.body.message?.text?.body || '';
    const telefone = req.body.message?.from || '';

    if (!mensagem || !telefone) return res.sendStatus(400);

    const resposta = await gerarRespostaQualificacao(mensagem, telefone);

    await axios.post(`https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`, {
        phone: telefone,
        message: resposta
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Client-Token': process.env.ZAPI_TOKEN
        }
    });

    if (leadEstaQualificado(telefone)) {
        const dados = extrairDadosLead(telefone);
        await axios.post(`https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`, {
            phone: corretorWhatsApp,
            message: `Novo lead qualificado:\n\n${dados}`
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Client-Token': process.env.ZAPI_TOKEN
            }
        });
    }

    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`Bot rodando na porta ${PORT}`);
});
