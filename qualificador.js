const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function gerarResposta(mensagemDoUsuario, historico = []) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `Você é um assistente inteligente de um imóvel único à venda em Araras, SP. 
O imóvel possui 5 suítes, área construída de 368 m², terreno de 690 m², varanda gourmet integrada, churrasqueira, escritório externo e fachada imponente.

Seu objetivo é qualificar o interessado com perguntas como:
- Você está buscando um imóvel para moradia ou investimento?
- Você está pronto para visitar o imóvel presencialmente?
- Você possui financiamento aprovado ou pretende fazer?
- Está em busca de algo com esse padrão (suítes, gourmet, terreno amplo etc)?

Ao final da qualificação, peça autorização para encaminhar o contato ao corretor responsável, Ramon Guiral.`  
      },
      ...historico,
      {
        role: "user",
        content: mensagemDoUsuario
      }
    ],
    temperature: 0.7
  });

  return completion.choices[0].message.content;
}

module.exports = gerarResposta;
