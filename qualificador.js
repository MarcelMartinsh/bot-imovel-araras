import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'SUA_CHAVE_AQUI'
});

export default async function gerarResposta(mensagem) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'Você é um assistente formal de atendimento para venda de imóvel localizado no Jardim Universitário, em Araras/SP. Sempre responda pedindo mais detalhes do interesse.'
      },
      {
        role: 'user',
        content: mensagem
      }
    ]
  });

  return completion.choices[0].message.content.trim();
}
