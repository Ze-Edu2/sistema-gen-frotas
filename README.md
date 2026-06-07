# 🚛 TransRoute
<img width="1853" height="911" alt="genFrotas" src="https://github.com/user-attachments/assets/4fa17eda-c4a1-408a-8fd2-7b5b997ce510" />

**TransRoute** é uma plataforma moderna e inteligente para gestão de frotas e controle de jornada de trabalho (bater ponto) para caminhoneiros e motoristas. Desenvolvida sob demanda com ferramentas de ponta, oferece uma experiência robusta tanto para administradores gerenciarem suas equipes quanto para os motoristas registrarem suas viagens com facilidade.

---

## 🚀 Tecnologias e Integrações

Este projeto combina inovação em Inteligência Artificial, persistência em tempo real e facilidade de escala:

- **Google AI Studio** & **Groq**: Toda a inteligência e o desenvolvimento do assistente virtual inteligente (**TransRoute Copilot**) foram projetados utilizando o **Google AI Studio**. A conversa ativa do Copilot é operada em tempo real com os modelos do **Groq** via rota de API serverless.
- <img width="330" height="361" alt="image" src="https://github.com/user-attachments/assets/dc342803-b2dd-41e3-b96c-1ddc26d49382" />
- **Supabase PostgreSQL**: Sincronização em tempo real das tabelas de motoristas, veículos, registros de jornada (work logs) e pagamentos, com segurança diretamente vinculada às tabelas locais.
- **Vercel**: Hospedagem da aplicação web estática de alta velocidade e de Serverless Functions (`/api/chat`) para prover o assistente inteligente sem expor chaves sensíveis.
- **React, Vite & Tailwind CSS**: Interface de usuário responsiva, otimizada, moderna e com estética dark mode profissional.

---

## 🛠️ Funcionalidades Principais

1. **Painel do Administrador (ADM)**:
   - Registro de motoristas e veículos na frota.
   - Revisão e aprovação de horas brutas de ponto registradas.
   - Pagamento de faturas e controle financeiro consolidado.
2. **Painel do Motorista**:
   - Registro de jornada simplificado (Iniciar e Finalizar Ponto em Viagem).
   - Acompanhamento de horas pendentes de validação e estimativa de ganhos acumulados.
3. **TransRoute Copilot**:
   - Assistente virtual ativado por IA.
   - Fornece respostas sobre o sistema e lê **dados em tempo real das tabelas correspondentes** (exemplo: quantidade total de motoristas, status de frotas de caminhões ou folha de ponto).

---
