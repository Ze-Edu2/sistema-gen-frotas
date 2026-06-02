import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Carrega variáveis do arquivo .env
dotenv.config();

const app = express();
const PORT = 3000;

// Configuração de parser JSON
app.use(express.json());

// Rota de saúde para monitoramento
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Provedor de chat Groq sem expor a API Key no navegador
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { messages, systemStats } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "O corpo da requisição deve conter um array 'messages'." });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: "GROQ_API_KEY não configurada no servidor. Por favor, adicione a chave de API do Groq nas configurações/segredos do seu ambiente." 
      });
    }

    const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    // Modificar/injetar nosso prompt de sistema para dar o contexto correto sobre o TransRoute
    let systemPromptText = `Você é o TransRoute Copilot, um assistente virtual inteligente e amigável da TransRoute, uma plataforma avançada de gestão de frotas e controle de jornada/bater ponto de caminhoneiros.

Sua missão é ajudar os usuários (motoristas, caminhoneiros e administradores) a usarem o sistema de maneira eficaz, respondendo dúvidas sobre funcionalidades, regras de negócios e problemas técnicos.

Aqui estão os detalhes cruciais do sistema TransRoute para embasar suas respostas:
1. PERFIS E REGISTRO:
   - Administrador (ADM): Tem controle total. Pode gerenciar caminhoneiros, cadastrar e alterar veículos, aprovar horas trabalhadas de jornadas de ponto na aba "Controle Pagamentos" ou "Jornadas", processar pagamentos efetivos e acompanhar métricas faturadas. O login de teste padrão é 'admin' com a senha 'admin123'.
   - Motorista / Caminhoneiro: Tem acesso a um painel focado. Pode bater ponto clicando em "Bater Ponto / Viagens", escolher o veículo que vai dirigir, escrever detalhes da rota/destino e iniciar a jornada de trabalho. Após a viagem, pode finalizar o ponto. Pode ver o valor estimado que faturou e o status de aprovação. Exemplos de motoristas criados no banco SQL de teste: 'jorge' (senha '123456') ou 'carlos' (senha '123456').

2. ARQUITETURA DE DADOS (SUPABASE VS CACHE):
   - O aplicativo suporta sincronização em tempo real de banco de dados via Supabase PostgreSQL e políticas RLS configuradas do schema.sql.
   - Se o projeto não estiver conectado ao Supabase ("Modo Local (Cache)"), os dados do usuário e registros são armazenados no LocalStorage do próprio navegador.
   - Para conectar o Supabase, o usuário deve ir para a aba "Banco Supabase" ou "Conexão Banco" do topo superior, preencher a URL e a Anon Key pública, e rodar o script SQL gerado clicando no botão para criar as tabelas 'frotas_admins', 'frotas_drivers', 'frotas_vehicles', 'frotas_work_logs' e 'frotas_payments'.

3. FUNCIONABILIDADES PRINCIPAIS:
   - Bater Ponto (Caminhoneiro): Na aba "Registar Jornadas / Bater Ponto", o caminhoneiro preenche as informações do caminhão, adiciona detalhes da mercadoria ou rota, e clica em "Iniciar Viagem/Jornada". O temporizador começa a contar. Quando chega ao destino, clica em "Finalizar Viagem".
   - Controle de Jornadas de Trabalho / Aprovação: As horas registradas entram como 'Aguardando ADM' (status 'pendente_aprovacao'). O Administrador irá então na aba "Controle de Pagamentos" ou "Jornadas", revisará as horas brutas e aprovará.
   - Faturamento e Payouts: Após a aprovação das horas, as viagens ficam com o status 'Aprovado' (aguardando pagamento). O administrador pode clicar em "Pagar Horas Selecionadas" para quitar e mudar o status para 'Pago', gerando o histórico financeiro correspondente.

Responda sempre em português brasileiro de forma educada, prestativa, altamente objetiva e profissional. Se o usuário falar sobre erros de credenciais, lembre-o de que o tipo de usuário correto (Administrador ou Motorista) precisa ser selecionado ativamente no momento do login.`;

    if (systemStats) {
      systemPromptText += `\n\nDADOS ATUAIS EM TEMPO REAL DAS TABELAS DO SISTEMA (Enviados dinamicamente no momento da mensagem):
- Modo de Banco de Dados: ${systemStats.isSupabase ? "Supabase PostgreSQL Ativo/Conectado" : "Modo Local (LocalStorage do Navegador)"}
- Total de motoristas cadastrados: ${systemStats.driversCount || 0}
- Lista de Motoristas (Nome, CPF, Status, Valor/Hora): ${JSON.stringify(systemStats.drivers || [])}
- Total de caminhões/veículos na frota: ${systemStats.vehiclesCount || 0}
- Lista de Veículos (Placa, Modelo, Marca, Status): ${JSON.stringify(systemStats.vehicles || [])}
- Total de jornadas de ponto registradas (geral): ${systemStats.workLogsCount || 0}
- Total de jornadas aguardando aprovação administrativa: ${systemStats.pendingWorkLogsCount || 0}
- Total de jornadas aprovadas para pagamento: ${systemStats.approvedWorkLogsCount || 0}
- Total de pagamentos efetuados/consolidados: ${systemStats.paymentsCount || 0}

Use esses dados em tempo real acima para responder diretamente a perguntas do tipo "quantos caminhoneiros temos cadastrados?", "quem está em viagem?", "quantos caminhões temos na frota?", ou "quais motoristas estão cadastrados?". Mostre os números corretos com confiança, e cite os nomes/placas se o usuário pedir!`;
    }

    const systemPromptMessage = {
      role: "system",
      content: systemPromptText
    };

    // Garantir que a primeira mensagem seja nosso system prompt
    const apiMessages = [systemPromptMessage, ...messages.filter(m => m.role !== "system")];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error response:", errorText);
      return res.status(response.status).json({ 
        error: `Erro ao comunicar com a API do Groq: ${response.statusText}`, 
        details: errorText 
      });
    }

    const data = await response.json();
    return res.json(data);

  } catch (error: any) {
    console.error("Exception in /api/chat:", error);
    return res.status(500).json({ error: "Erro interno no servidor de chat.", details: error.message });
  }
});

// Setup do Vite ou arquivos estáticos dependendo do ambiente
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Configura o Vite em modo middleware para desenvolvimento
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve os arquivos de build estáticos em produção
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TransRoute Fullstack] Servidor rodando em http://localhost:${PORT}`);
    console.log(`[TransRoute Fullstack] Ambiente: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer();
