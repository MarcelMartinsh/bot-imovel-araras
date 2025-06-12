const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function gerarResposta(messages) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4", // ou "gpt-3.5-turbo"
      messages,
      temperature: 0.7,
    });

    const resposta = response.choices[0]?.message?.content?.trim();
    return resposta || "Não consegui gerar uma resposta no momento.";
  } catch (error) {
    console.error("❌ Erro ao chamar OpenAI:", error.response?.data || error.message);
    throw new Error("Falha ao gerar resposta do ChatGPT.");
  }
}

module.exports = { gerarResposta };
