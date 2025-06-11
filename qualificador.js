
const axios = require('axios');

async function gerarResposta(history) {
  const resposta = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o',
      messages: history,
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  return resposta.data.choices[0].message.content;
}

function isQualificado(resposta) {
  const palavrasChave = ['visita', 'interessado', 'encaminharemos', 'corretor ramon', 'financiamento', 'qualificado'];
  return palavrasChave.some(p => resposta.toLowerCase().includes(p));
}

module.exports = {
  gerarResposta,
  isQualificado,
};
