# Relatório de Análise Técnica - Projeto OmniConnect (dev-techchat)

**Data:** 29 de Dezembro de 2025
**Função:** Tech Lead / Arquiteto de Software Sênior
**Objetivo:** Avaliar a prontidão para produção, qualidade de código, arquitetura, segurança e integração de dados do projeto, conforme solicitado.

---

## 🧩 ETAPA 1 — ANÁLISE COMPLETA DO REPOSITÓRIO

O projeto `dev-techchat` é uma aplicação web construída com **React, TypeScript e Vite**, utilizando **Tailwind CSS** (implícito pelo uso de classes como `bg-purple-600`) e a biblioteca **Recharts** para visualização de dados.

### 1. Estrutura do Projeto

| Aspecto | Avaliação | Observação |
| :--- | :--- | :--- |
| **Organização de Pastas** | **Boa** | Estrutura clara (`components`, `pages`, `services`, `types`). Segue o padrão de projetos React/Vite. |
| **Separação Frontend/Backend** | **Inexistente** | O projeto é puramente **frontend**. Não há código de backend (Node.js, Python, etc.) ou servidor de API real. A lógica de "serviço" está em `services/api.ts`, que é uma camada de abstração para dados **mockados**. |
| **Acoplamentos Indevidos** | **Alto Acoplamento de Dados** | O arquivo `constants.tsx` centraliza todos os dados mockados. As páginas (`pages/*`) e a camada de serviço (`services/api.ts`) dependem diretamente desses mocks. A arquitetura é de **UI-First**, onde a interface foi construída antes da infraestrutura de dados. |

### 2. Lógica de Negócio (UI vs. Funcionalidade)

O projeto apresenta uma interface rica e completa, simulando um sistema SaaS multi-tenant de atendimento e CRM. No entanto, a **funcionalidade real é nula**, pois todos os dados são estáticos.

| Módulo | Status Atual | Lacunas de Funcionalidade |
| :--- | :--- | :--- |
| **Autenticação/Usuário** | **Mockada** | Usuário fixo (`MOCK_USERS[0]`) em `App.tsx`. Não há login, registro, recuperação de senha ou gestão de sessões. O controle de permissão (`isAdminMode`) é uma simulação de estado local. |
| **Atendimento (Chat)** | **Mockado** | Mensagens (`MOCK_MESSAGES`) e contatos (`MOCK_CONTACTS`) são estáticos. O envio de mensagens em `api.ts` apenas gera um novo objeto `Message` com timestamp local, sem persistência ou integração com canais (WhatsApp, Instagram). |
| **CRM (Kanban/Propostas)** | **Mockado** | O funil de vendas (`MOCK_KANBAN_COLUMNS`) é estático. A movimentação de cards em `api.ts` é simulada (`return true;`). O valor monetário (`pipelineValue` em `Contact` e `value` em `KanbanCard`) não é persistido. |
| **Tarefas** | **Mockada com Persistência Local** | O módulo `tasks` em `api.ts` simula operações CRUD (`list`, `create`, `update`, `delete`) modificando a variável `MOCK_TASKS` em memória. **Não há persistência real**; ao recarregar a página, as tarefas voltam ao estado inicial. |
| **Relatórios** | **Apenas Visual** | Todos os dados em `pages/Reports.tsx` são **hardcoded** (`attendanceData`, `crmData`, etc.). As métricas solicitadas (Tempo Médio de Resposta, CSAT, Taxa de Conversão) não são calculadas a partir de dados transacionais, mas sim valores estáticos. |
| **Multi-Tenancy (SaaS)** | **Apenas Tipagem** | As estruturas de dados (`Company`, `Plan`, `SaasStats`) existem, mas não há lógica para isolamento de dados por `companyId`. O sistema opera como um monólito de dados mockados. |

### 3. Integrações

A única "integração" é a camada de serviço mockada em `services/api.ts`.

| Tipo de Integração | Status | Detalhe |
| :--- | :--- | :--- |
| **Conectado** | **Nenhum** | Não há chamadas HTTP reais (e.g., `fetch` ou `axios`) para um backend. |
| **Mockado** | **100%** | Todas as operações de dados (CRUD de Contatos, Mensagens, Tarefas, CRM) são mockadas. |
| **A Integrar** | **Tudo** | Todo o acesso a dados, autenticação e lógica de negócio que exige persistência precisa ser reescrito para se conectar ao Supabase. |

---

## 🎯 CONCLUSÃO DA ANÁLISE (Prontidão para Produção)

O projeto está em um estágio de **Proof of Concept (PoC) de Interface de Usuário**. A prontidão para produção é **zero**.

**Próxima Etapa:** O foco deve ser a **Etapa 2**, que é a reengenharia da camada de dados e serviços para integrar o Supabase, transformando o projeto de um *mock* de UI em um **MVP Funcional**.

**Ação Imediata:** Avançar para a **Etapa 2: Conexão com Supabase (Obrigatório)**.

---

## 🗄️ ETAPA 2 — CONEXÃO COM SUPABASE (OBRIGATÓRIO)

A estratégia central para a migração é adotar o Supabase como o backend principal, utilizando seu banco de dados PostgreSQL, autenticação (Supabase Auth) e políticas de segurança (RLS) para garantir a arquitetura multi-tenant.

### 1. Modelo Relacional Proposto (PostgreSQL)

O modelo é desenhado para suportar a arquitetura multi-tenant, onde a coluna `company_id` é a chave para o isolamento de dados via RLS.

#### 1.1. Estrutura Central (Multi-Tenant)

| Tabela | Chave Primária (PK) | Chaves Estrangeiras (FK) | Colunas Chave | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| `companies` | `id` (UUID) | - | `name`, `plan_id` | Tabela de *tenants* (empresas). |
| `users` | `id` (UUID) | `company_id` (companies.id) | `email`, `role` | Usuários do sistema, vinculados ao `auth.users` do Supabase. |

#### 1.2. Módulos de Atendimento e Mensagens

| Tabela | Chave Primária (PK) | Chaves Estrangeiras (FK) | Colunas Chave | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| `contacts` | `id` (UUID) | `company_id` (companies.id) | `name`, `phone`, `status` | Contatos de cada empresa. |
| `atendimentos` | `id` (UUID) | `company_id`, `contact_id`, `assigned_to_user_id` | `channel`, `status`, `created_at` | Representa uma conversa/ticket. |
| `mensagens` | `id` (UUID) | `company_id`, `atendimento_id` | `sender_id`, `content`, `timestamp` | Mensagens dentro de um atendimento. |
| `avaliacoes` | `id` (UUID) | `company_id`, `atendimento_id` | `score`, `comment`, `created_at` | Armazena o CSAT (Customer Satisfaction Score). |

#### 1.3. Módulos de CRM e Propostas

| Tabela | Chave Primária (PK) | Chaves Estrangeiras (FK) | Colunas Chave | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| `funil_vendas_stages` | `id` (UUID) | `company_id` | `name`, `order` | Etapas configuráveis do funil (e.g., "Novo Lead", "Proposta"). |
| `propostas` | `id` (UUID) | `company_id`, `contact_id`, `stage_id` | `value`, `status`, `sent_at` | Documentos de propostas comerciais. |
| `metas` | `id` (UUID) | `company_id`, `user_id` | `target_value`, `period`, `type` | Metas de vendas ou atendimento por usuário/equipe. |

#### 1.4. Módulo de Tarefas

| Tabela | Chave Primária (PK) | Chaves Estrangeiras (FK) | Colunas Chave | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| `tarefas` | `id` (UUID) | `company_id`, `assignee_id` | `title`, `due_date`, `completed` | Tarefas internas do sistema. |

### 2. Estratégia de Integração com Supabase

A integração deve seguir o princípio de **"Database-as-API"** do Supabase, utilizando o cliente JavaScript (`@supabase/supabase-js`) no frontend.

#### 2.1. Autenticação (Supabase Auth)

1.  **Instalação:** Instalar o cliente Supabase (`@supabase/supabase-js`).
2.  **Login/Registro:** Substituir o estado local de usuário (`currentUser` em `App.tsx`) pela gestão de sessão do Supabase Auth.
3.  **Perfis de Usuário:** Criar um *trigger* ou *function* no Supabase para, após o registro em `auth.users`, inserir um registro correspondente na tabela `public.users`, preenchendo o `company_id` e o `role` inicial.
4.  **Permissões:** A lógica de permissões (`admin`, `atendente`, `gestor`) será implementada via RLS e verificações de `user_role()` no banco de dados.

#### 2.2. Segurança (Row Level Security - RLS)

O RLS é **obrigatório** para a arquitetura multi-tenant.

1.  **Habilitar RLS:** Habilitar RLS em todas as tabelas de dados transacionais (`contacts`, `atendimentos`, `mensagens`, `propostas`, `tarefas`, etc.).
2.  **Política Padrão:** A política de segurança deve garantir que um usuário só possa `SELECT`, `INSERT`, `UPDATE` e `DELETE` em registros onde o `company_id` do registro seja igual ao `company_id` do usuário logado.

```sql
-- Exemplo de Política RLS para a tabela 'contacts'
CREATE POLICY "Enable all access for users based on company_id"
ON public.contacts
FOR ALL
TO authenticated
USING (
  (SELECT company_id FROM public.users WHERE id = auth.uid()) = company_id
)
WITH CHECK (
  (SELECT company_id FROM public.users WHERE id = auth.uid()) = company_id
);
```

#### 2.3. Migração da Camada de Serviço

1.  **Remoção de Mocks:** Eliminar `MOCK_CONTACTS`, `MOCK_MESSAGES`, etc., de `constants.tsx`.
2.  **Refatoração de `services/api.ts`:** Reescrever todas as funções de `api.ts` para usar o cliente Supabase, substituindo o `delay(ms)` por chamadas reais de `supabase.from('tabela').select('*')`.

**Exemplo de Refatoração (Listar Contatos):**

```typescript
// services/api.ts (Após refatoração)
import { supabase } from './supabaseClient'; // Novo arquivo de configuração

// ...

  contacts: {
    list: async (): Promise<Contact[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('last_message_time', { ascending: false });

      if (error) throw error;
      return data as Contact[];
    },
    // ...
  },
// ...
```

### 3. Próximos Passos

A **Etapa 3** do plano de trabalho será a implementação das métricas e relatórios, que agora poderão ser construídos com **queries reais** no Supabase, substituindo os dados mockados em `pages/Reports.tsx`.

---

## 📊 ETAPA 3 — RELATÓRIOS E MÉTRICAS REAIS

Com a base de dados estruturada no Supabase (PostgreSQL), é possível implementar as métricas solicitadas usando *Views* e *Stored Procedures* (Funções) para garantir performance e precisão.

### 1. Estratégia de Implementação de Métricas

Em vez de calcular métricas complexas no frontend (o que seria ineficiente e inseguro), a recomendação é utilizar o poder do PostgreSQL para pré-calcular ou agregar os dados.

| Relatório | Métrica | Lógica de Cálculo (SQL) |
| :--- | :--- | :--- |
| **Atendimento** | **Total de Atendimentos** | `COUNT(*)` na tabela `atendimentos` no período. |
| **Atendimento** | **Tempo Médio de Resposta (TMR)** | Média da diferença de tempo entre a primeira mensagem do contato e a primeira resposta do atendente, agrupada por `atendimento_id`. |
| **Atendimento** | **Resolução no 1º Contato** | `COUNT(*)` de `atendimentos` onde o `status` mudou de 'open' para 'resolved' com um número mínimo de mensagens trocadas (e.g., < 5). |
| **Atendimento** | **CSAT (Satisfação)** | Média da coluna `score` na tabela `avaliacoes`. |
| **Propostas** | **Taxa de Conversão** | `COUNT(status = 'aceita') / COUNT(status = 'enviada')` na tabela `propostas`. |
| **Propostas** | **Valor Total Fechado** | `SUM(value)` de `propostas` onde `status = 'aceita'`. |
| **Tarefas** | **Tempo Médio de Conclusão** | Média da diferença de tempo entre `created_at` e `completed_at` para tarefas concluídas. |
| **Tarefas** | **Performance por Usuário** | `COUNT(*)` de `tarefas` concluídas, agrupado por `assignee_id`. |

**Recomendação Técnica:** Criar *Views* materializadas no PostgreSQL para as métricas mais acessadas (como as do Dashboard e KPI Cards) e agendá-las para atualização periódica (e.g., a cada 5 minutos) via *pg_cron* (extensão disponível no Supabase). Isso garantirá que o frontend acesse dados pré-calculados e rápidos.

### 2. Refatoração do `Reports.tsx`

O componente `Reports.tsx` deve ser refatorado para:

1.  Receber um *hook* de dados (`useReportsData`) que chama a `api.ts` refatorada.
2.  A `api.ts` deve chamar as *Views* ou *Funções* do Supabase.
3.  Os dados estáticos (`attendanceData`, `crmData`, etc.) devem ser substituídos pelos dados reais retornados.

## 🧾 ETAPA 4 — EXPORTAÇÃO E PRODUÇÃO

### 1. Exportação de Relatórios em PDF

A geração de PDF deve ser feita no backend para evitar sobrecarga no cliente e garantir a segurança do processo.

**Estratégia:**

1.  **Backend (Supabase Edge Functions):** Utilizar uma *Edge Function* (baseada em Deno/TypeScript) no Supabase.
2.  **Geração:** A função receberá o ID do relatório e o `company_id` (garantido pelo Auth/RLS).
3.  **Biblioteca:** Usar uma biblioteca de geração de PDF leve compatível com Deno (ex: `pdf-lib` ou renderização de HTML com `weasyprint` se for necessário um ambiente Node/Python, o que exigiria um serviço externo ao Supabase Edge Functions).
4.  **Fluxo:** O frontend chama a API da *Edge Function* -> A função consulta o banco (via *service role* ou *anon key* com RLS) -> Gera o PDF -> Retorna o arquivo ou um link temporário para download.

### 2. Prontidão para Produção

| Item | Ação Necessária |
| :--- | :--- |
| **Variáveis de Ambiente** | Criar arquivo `.env` para armazenar `SUPABASE_URL` e `SUPABASE_ANON_KEY`. O frontend deve usar a chave `ANON_KEY`. |
| **Ajuste para Supabase Cloud** | Garantir que o cliente Supabase seja inicializado corretamente com as variáveis de ambiente. |
| **Build Final** | O comando `npm run build` (usando Vite) está correto para gerar os arquivos estáticos. |
| **Pipeline de Deploy** | **Sugestão:** Utilizar a integração nativa do Vercel ou Netlify com o repositório GitHub. O deploy do frontend é estático. O Supabase gerencia o backend (banco, Auth, Edge Functions) de forma independente. |

**Pipeline Sugerido:**

1.  **Frontend:** GitHub -> Vercel/Netlify (Deploy automático em *push* para `main`).
2.  **Backend:** GitHub -> Supabase (Migrations via CLI, Edge Functions via CLI).

---

---

## 🛠️ ETAPA 5 — LISTA DE MELHORIAS PRIORITÁRIAS E ROADMAP

### 1. Status do Projeto (Baseado na Análise)

| Categoria | Lista do que está **Pronto** | Lista do que está **Incompleto** | Lista do que está **Errado** |
| :--- | :--- | :--- | :--- |
| **Frontend/UI** | Estrutura de componentes (React/Vite). Roteamento de páginas. Design responsivo (Tailwind CSS). | Componentes de formulário não conectados a estado real. | Uso de `style` inline para *white label* (melhor seria usar CSS custom properties ou um tema). |
| **Dados/Lógica** | Tipagem de dados (interfaces em `types.ts`). Abstração de API (`services/api.ts`). | Todas as funcionalidades (Chat, CRM, Tarefas, Relatórios) são incompletas por dependerem de mocks. | **O uso de dados mockados é a falha crítica**, impedindo qualquer funcionalidade real. |
| **Arquitetura** | Separação lógica de módulos (pages, components). | Não há separação entre frontend e backend (o backend é inexistente). | O uso de `MOCK_TASKS` com persistência em memória é uma simulação enganosa de funcionalidade. |

### 2. Lista do que Falta para Produção

1.  **Infraestrutura de Backend:** Configuração do Supabase (Banco de Dados, Auth, RLS).
2.  **Conexão de Dados:** Refatoração completa de `services/api.ts` para usar o Supabase.
3.  **Autenticação Real:** Implementação do fluxo de Login/Logout/Sessão.
4.  **Isolamento Multi-Tenant:** Implementação de RLS em todas as tabelas transacionais.
5.  **Lógica de Negócio:** Implementação de *Triggers* e *Functions* no PostgreSQL para calcular métricas e gerenciar fluxos complexos (e.g., movimentação de Kanban).
6.  **Integração Omnichannel:** Conexão com uma API de mensagens (e.g., Twilio, 360dialog) para o módulo de Chat.
7.  **Geração de PDF:** Implementação da *Edge Function* para exportação de relatórios.

### 3. Roadmap Técnico em Fases

O roadmap é focado em transformar o PoC de UI em um SaaS funcional e escalável.

#### Fase 1: MVP Funcional (Foco em Dados e Auth)

| Objetivo | Entregáveis |
| :--- | :--- |
| **Infraestrutura** | Supabase configurado (tabelas e RLS). |
| **Autenticação** | Login/Logout funcional com Supabase Auth. |
| **CRUD Básico** | Módulos de **Contatos** e **Tarefas** 100% conectados ao Supabase (CRUD completo). |
| **Chat Básico** | Listagem de `atendimentos` e `mensagens` do Supabase. Envio de mensagens apenas para persistência (sem integração com canal externo). |

#### Fase 2: Versão Estável (Foco em Lógica de Negócio e Métricas)

| Objetivo | Entregáveis |
| :--- | :--- |
| **CRM Completo** | Módulo **Kanban** conectado, com movimentação de cards persistida e atualização de `pipelineValue`. |
| **Relatórios Reais** | Implementação de *Views* no PostgreSQL para as métricas de **Atendimento** e **Propostas**. |
| **Exportação** | *Edge Function* para geração de PDF (Etapa 4). |
| **Segurança** | Auditoria e refinamento das políticas de RLS. |

#### Fase 3: Versão Escalável (Foco em Omnichannel e Performance)

| Objetivo | Entregáveis |
| :--- | :--- |
| **Omnichannel** | Integração com API de mensagens (e.g., Webhook) para recebimento e envio de mensagens em tempo real. |
| **Performance** | Otimização de *queries* e uso de *Views* materializadas para Dashboards. |
| **SaaS Core** | Implementação completa da lógica de **Planos e Limites** (tabela `companies` e checagem de limites). |
| **Campanhas** | Módulo de **Disparos** (Campaigns) funcional, utilizando *Background Jobs* do Supabase (ou serviço externo) para envio em massa.

---
