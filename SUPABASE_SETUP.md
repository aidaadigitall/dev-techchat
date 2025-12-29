# Guia de Configuração do Supabase - OmniConnect

Para que o sistema funcione corretamente com o seu banco de dados Supabase, você precisa criar as tabelas necessárias. Abaixo está o script SQL que você deve executar no **SQL Editor** do seu painel do Supabase.

## 1. Script de Criação de Tabelas

```sql
-- 1. Tabela de Contatos
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    avatar TEXT,
    tags TEXT[] DEFAULT '{}',
    company TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Mensagens
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender_id TEXT NOT NULL, -- 'me' ou ID do contato
    timestamp TIMESTAMPTZ DEFAULT now(),
    type TEXT DEFAULT 'TEXT',
    status TEXT DEFAULT 'sent',
    channel TEXT DEFAULT 'whatsapp'
);

-- 3. Tabela de Tarefas
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    priority TEXT DEFAULT 'p4',
    project_id TEXT DEFAULT 'inbox',
    completed BOOLEAN DEFAULT false,
    assignee_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabelas de CRM (Pipelines e Colunas)
CREATE TABLE public.pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.kanban_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    color TEXT,
    "order" INTEGER DEFAULT 0
);

CREATE TABLE public.kanban_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    column_id UUID REFERENCES public.kanban_columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    value NUMERIC DEFAULT 0,
    contact_id UUID REFERENCES public.contacts(id),
    contact_name TEXT,
    priority TEXT DEFAULT 'medium',
    tags TEXT[] DEFAULT '{}',
    due_date DATE
);

-- 5. Respostas Rápidas
CREATE TABLE public.quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shortcut TEXT NOT NULL,
    content TEXT NOT NULL
);
```

## 2. Como pegar as informações de Produção

Para colocar o sistema em produção, você não deve usar o endereço `127.0.0.1` (que é local). Siga estes passos:

1.  Acesse o painel do [Supabase](https://supabase.com/).
2.  Selecione o seu projeto.
3.  No menu lateral esquerdo, clique em **Project Settings** (ícone de engrenagem).
4.  Clique em **API**.
5.  Lá você encontrará:
    *   **Project URL:** Substitua o `VITE_SUPABASE_URL` no seu arquivo `.env` por esta URL.
    *   **API Keys (anon public):** Substitua o `VITE_SUPABASE_ANON_KEY` por esta chave.

## 3. Variáveis de Ambiente no Vite

Note que no Vite (usado neste projeto), as variáveis de ambiente devem começar com `VITE_`. Eu já ajustei o código para usar:
*   `VITE_SUPABASE_URL`
*   `VITE_SUPABASE_ANON_KEY`
