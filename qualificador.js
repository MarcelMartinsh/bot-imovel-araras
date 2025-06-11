
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function gerarResposta(historico) {
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: historico,
    });

    return completion.data.choices[0].message.content;
  } catch (err) {
    console.error("❌ Erro ao chamar OpenAI:", err.response?.data || err.message);
    throw new Error("Falha ao gerar resposta do ChatGPT.");
  }
}

function isQualificado(texto) {
  const palavrasChave = ['compra', 'visita', 'financiamento', 'interesse', 'valor'];
  return palavrasChave.some(p => texto.toLowerCase().includes(p));
}

module.exports = { gerarResposta, isQualificado };
