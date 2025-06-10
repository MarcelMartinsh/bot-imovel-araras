const { Configuration, OpenAIApi } = require("openai");
const leads = {};

const config = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(config);

async function gerarRespostaQualificacao(mensagem, telefone) {
    if (!leads[telefone]) leads[telefone] = [];

    leads[telefone].push({ role: "user", content: mensagem });

    const promptBase = {
        role: "system",
        content:
            "Você é um assistente inteligente de um imóvel único à venda em Araras, SP. " +
            "O imóvel possui 5 suítes, área construída de 368 m², terreno de 690 m², varanda gourmet integrada, " +
            "churrasqueira, escritório externo e fachada imponente. Seu objetivo é qualificar o interessado com perguntas como:\\n" +
            "1. Compra financiada ou à vista?\\n" +
            "2. Já conhece a região?\\n" +
            "3. Perfil da família?\\n" +
            "4. Faixa de valor disponível?\\n" +
            "5. Interesse em receber vídeo e agendar visita?\\n" +
            "Se o cliente demonstrar interesse, peça o nome e melhor horário para contato. Use linguagem natural e objetiva."
    };

    const response = await openai.createChatCompletion({
        model: "gpt-4",
        messages: [promptBase, ...leads[telefone]],
        temperature: 0.7
    });

    const resposta = response.data.choices[0].message.content;
    leads[telefone].push({ role: "assistant", content: resposta });
    return resposta;
}

function leadEstaQualificado(telefone) {
    const historico = leads[telefone]?.map(m => m.content.toLowerCase()).join(' ') || '';
    return historico.includes("meu nome é") ||
           historico.includes("me chama") ||
           historico.includes("me ligar") ||
           historico.includes("quero visitar") ||
           historico.includes("sim, pode me chamar") ||
           historico.includes("pode entrar em contato");
}

function extrairDadosLead(telefone) {
    return leads[telefone]?.map(m => m.content).join('\\n') || 'sem dados';
}

module.exports = { gerarRespostaQualificacao, leadEstaQualificado, extrairDadosLead };
