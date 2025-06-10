const axios = require('axios');

async function gerarResposta(texto) {
  const mensagemString = typeof texto === 'string' ? texto : JSON.stringify(texto);

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente cordial que responde dúvidas sobre um imóvel à venda.'
        },
        {
          role: 'user',
          content: mensagemString // 🔧 AQUI está corrigido!
        }
      ],
      temperature: 0.7
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.choices[0].message.content.trim();
}

function qualificarLead({ phone, message }) {
  // Aqui você pode colocar validações mais específicas se quiser
  if (!message || typeof message !== 'string') return false;

  return {
    phone,
    message
  };
}

module.exports = async function ({ phone, message }) {
  const lead = qualificarLead({ phone, message });
  if (!lead) return null;

  const resposta = await gerarResposta(lead.message);
  return resposta;
};
