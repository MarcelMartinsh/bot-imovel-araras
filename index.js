require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { gerarRespostaQualificacao, leadEstaQualificado, extrairDadosLead } = require('./qualificador');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const corretorWhatsApp = process.env.CORRETOR_WHATSAPP;

// Função para envio automático de vídeo
async function enviarVideoZapi(telefone) {
    await axios.post(`https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-file`, {
        phone: telefone,
        url: "https://drive.google.com/uc?export=download&id=1HXZIFgMYvZ4w6e3BodWcW9z39bexyN1f",
        fileName: "video-imovel-araras.mp4",
        caption: "🎥 Segue o vídeo do imóvel no Jardim Universitário, conforme solicitado."
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Client-Token': process.env.ZAPI_TOKEN
        }
    });
}

app.post('/webhook', async (req, res) => {
    const mensagem = req.body.message?.text?.body || '';
    const telefone = req.body.message?.from || '';

    if (!mensagem || !telefone) return res.sendStatus(400);

    const mensagemEsperada = "gostaria de mais informações sobre a casa de alto padrão em araras/sp, por favor.";
    const mensagemRecebida = mensagem.trim().toLowerCase();

    if (mensagemRecebida !== mensagemEsperada) {
        return res.sendStatus(200); // ignora completamente a mensagem
    }

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

    const lower = resposta.toLowerCase();
    if (lower.includes("vídeo") || lower.includes("video") || lower.includes("posso ver o vídeo") || lower.includes("tem vídeo")) {
        await enviarVideoZapi(telefone);
    }

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
