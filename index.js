import express from 'express';
import axios from 'axios';
import gerarResposta from './qualificador.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Configurações da instância Z-API
const zApiUrl = 'https://api.z-api.io/instances/3E25D92604A4304948AE06E9A5181015/token/7CCF4CA1D28B3807703B71A8/send-text';

app.post('/webhook', async (req, res) => {
  const body = req.body;
  console.log('🔍 Corpo recebido:', JSON.stringify(body, null, 2));

  try {
    const telefone = body.phone;
    const mensagem = body.text?.message;

    if (!telefone || !mensagem) {
      console.warn('📭 Requisição sem telefone ou mensagem válida.');
      return res.status(400).json({ error: 'Telefone ou mensagem ausente.' });
    }

    console.log(`📩 Mensagem recebida de ${telefone}: ${mensagem}`);
    console.log('🧠 Enviando para o ChatGPT...');

    const resposta = await gerarResposta(mensagem);
    console.log('🧠 Resposta gerada pelo ChatGPT:', resposta);

    console.log('📤 Enviando mensagem pelo Z-API...');

    const payload = {
      phone: telefone,
      message: resposta
    };

    const zapiResponse = await axios.post(zApiUrl, payload);
    console.log('✅ Mensagem enviada com sucesso:', zapiResponse.data);

    res.status(200).json({ status: 'OK', resposta });
  } catch (error) {
    console.error('❌ Erro no processamento:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erro interno', detalhes: error.response?.data || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
