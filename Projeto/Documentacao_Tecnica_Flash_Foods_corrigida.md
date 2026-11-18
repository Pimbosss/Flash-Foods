# 📘 Documentação Técnica Completa — Flash Foods

Este documento descreve a arquitetura, o fluxo de dados, os arquivos principais e o funcionamento interno do sistema **Flash Foods**. Ele serve tanto como **material de apoio para a apresentação acadêmica (02/12)** quanto como **guia de integração para novos integrantes da equipe**.

---

## 1. Visão Geral e Tecnologias Utilizadas

O **Flash Foods** é uma aplicação web de delivery com suporte a três perfis distintos de usuários (**Cliente**, **Restaurante** e **Entregador**), conectada em tempo real a serviços em nuvem.

* **Framework Front-end:** Next.js (App Router) com React e TypeScript.
* **Gerenciamento de Estado Global:** React Context API (`CarrinhoContext`).
* **Padrão de Arquitetura:** *Custom Hooks* (separação total entre camada de apresentação visual e camada de lógica/dados).
* **Autenticação e Banco de Dados (BaaS):** Firebase Authentication e Cloud Firestore (NoSQL).
* **Estilização:** CSS Modules (`.module.css`) e folhas de estilo globais/modulares responsivas (*Media Queries*).
* **Hospedagem e CI/CD:** Vercel integrada diretamente às branches do GitHub.

---

## 2. Estrutura de Diretórios

```text
src/
├── app/                         # Rotas e telas da aplicação (App Router)
│   ├── area-entregador/         # Painel operacional do motoboy
│   │   ├── components/          # MapsGps.tsx, ListaDisponiveis.tsx, etc.
│   │   ├── hooks/               # useAreaEFunctions.ts (motor de entregas e ganhos)
│   │   ├── area-e.module.css    # Estilos responsivos do painel do entregador
│   │   └── page.tsx             # Orquestrador da tela do entregador
│   ├── area-restaurante/        # Painel de gestão do estabelecimento
│   │   ├── components/          # VisaoGeral.tsx, Produtos.tsx, Pedidos.tsx, Perfil.tsx
│   │   ├── hooks/               # useAreaRestaurante.ts (carrega dados da loja e pedidos)
│   │   ├── restaurante.module.css
│   │   └── page.tsx
│   ├── cadastro/                # Cadastro de clientes (page.tsx + hooks/useCadastro.ts)
│   ├── cadastro-entregador/     # Cadastro de motoboys (page.tsx + hooks/useCadastroEntregador.ts)
│   ├── cadastro-restaurante/    # Cadastro de lojas (page.tsx + hooks/useCadastroRestaurante.ts)
│   ├── carrinho/                # Sacola de compras (page.tsx + hooks/useCarrinhoPage.ts + carrinho.css)
│   ├── login/                   # Autenticação unificada (page.tsx + hooks/useLogin.ts)
│   ├── pedir-agora/             # Vitrine de lojas e pratos (page.tsx + hooks/usePedirAgora.ts + pedir_agora.css)
│   ├── perfil/                  # Dados da conta e histórico (page.tsx + components/HistoricoPedido.tsx + hooks/usePerfil.ts)
│   ├── globals.css              # Estilos globais (formulários de login/cadastro e reset)
│   ├── layout.tsx               # Estrutura raiz (envolve o app no CarrinhoProvider, Header e Footer)
│   ├── page.module.css          # Estilos responsivos da página inicial (Home)
│   └── page.tsx                 # Landing Page / Página Inicial
├── components/                  # Componentes globais compartilhados
│   ├── Header.tsx & Header.css  # Barra de navegação inteligente e responsiva
│   └── Footer.tsx & Footer.css  # Rodapé institucional responsivo
├── context/                     # Contextos globais do React
│   └── CarrinhoContext.tsx      # Estado compartilhado da sacola de compras
├── core/                        # Tipagens e interfaces TypeScript (Usuarios.ts, etc.)
└── services/                    # Conexões externas
    └── firebase.ts              # Inicialização Singleton do Firebase (auth e db)
```

---

## 3. Camada de Dados e Nuvem (`src/services/firebase.ts`)

### Por que utilizamos Firebase?

Anteriormente, o sistema utilizava um servidor local simulado (`json-server` / `db.json`). Ao publicar o projeto na nuvem (**Vercel**), tornou-se necessário um banco de dados real e acessível de qualquer dispositivo. O Firebase atua como um **BaaS (*Backend-as-a-Service*)**, fornecendo infraestrutura segura sem a necessidade de manter um servidor back-end separado.

### Como o `firebase.ts` funciona?

* **Variáveis de Ambiente (`.env.local`):** As 6 chaves de configuração do projeto ficam isoladas em variáveis `NEXT_PUBLIC_FIREBASE_*` para não expor credenciais no código-fonte público e facilitar a troca de ambientes na Vercel.
* **Padrão Singleton (`!getApps().length ? initializeApp(...) : getApp()`):** Garante que o Next.js inicialize apenas uma única conexão com o Google mesmo durante recarregamentos rápidos de desenvolvimento.
* **Exportações:** Exporta exclusivamente `auth` (gerenciador de login) e `db` (instância do banco Firestore).

### Estrutura das Coleções no Cloud Firestore (NoSQL)

1. **`users`:** Cada documento usa como ID o mesmo **`uid`** gerado pelo Firebase Authentication. Armazena `name`, `email`, `phone`, `cpf`, `endereco`, `tipo` (`"cliente"`, `"restaurante"` ou `"entregador"`) e `restauranteId` (quando aplicável).
2. **`restaurantes`:** Armazena `nome`, `cnpj`, `categoria`, `endereco`, `usuarioId` (chave que liga a loja ao dono) e o array **`produtos`** (lista de pratos cadastrados).
3. **`pedidos`:** Armazena `usuarioId`, `usuarioNome`, `endereco` (destino), `restauranteId`, `restaurante`, `itens`, `subtotal`, `taxaEntrega`, `total`, `data`, `status` e métricas de entrega (`distancia`, `tempo`, `valor`).

---

## 4. Detalhamento Arquivo por Arquivo

### 4.1. Componentes Globais (`src/components/` e `src/context/`)

### # `CarrinhoContext.tsx`

* **O que faz:** Cria um estado global (`CarrinhoProvider`) que envolve toda a aplicação no `layout.tsx`, permitindo que o usuário adicione itens na tela *Pedir Agora*, veja o contador subir no *Header* e finalize a compra no *Carrinho* sem perder os dados ao trocar de rota.
* **Funções exportadas:**
  * `adicionarAoCarrinho(produto)`: Verifica se o item já existe na sacola; se existir, soma `+1` na quantidade; caso contrário, insere o item.
  * `aumentarQuantidade(id)` / `diminuirQuantidade(id)`: Altera a quantidade de forma imutável (remove o item automaticamente se a quantidade chegar a zero).
  * `removerDoCarrinho(id)`: Filtra o array removendo o produto escolhido.
  * `valorTotal`: Calcula a soma total convertendo preços formatados em string (ex: `"29,90"`) para número decimal válido (`29.90`).

### # `Header.tsx` & `Header.css`

* **O que faz:** Barra de navegação superior dinâmica que muda sua aparência conforme a rota atual e o status de login do usuário.
* **Lógica interna:**
  * Utiliza `usePathname()` para ocultar completamente o cabeçalho nas telas de `/login` e `/cadastro*`.
  * Exibe os links de âncora (`Como funciona`, `Para entregadores`, `Restaurantes`) **apenas** quando o usuário está na página inicial (`/`).
  * Escuta o evento customizado `window.addEventListener("perfilAtualizado")` para atualizar o nome do usuário (`Olá, Nome`) e o botão do painel correspondente (`Área do Restaurante` ou `Área do Entregador`) instantaneamente após o login ou edição de perfil.
  * **Responsividade (`Header.css`):** Em telas abaixo de `800px`, deixa de ser fixo (`position: relative`) e empilha logotipo, links e botões em linhas centralizadas para não cortar elementos na tela do celular.

### # `Footer.tsx` & `Footer.css`

* **O que faz:** Rodapé institucional dividido em 4 colunas no desktop (`#titulo2`, `#voce`, `#parceiros`, `#empresa`) e a barra de direitos autorais (`#direitos`).
* **Responsividade (`Footer.css`):** Em celulares (`max-width: 600px`), a regra `footer > *:not(#titulo2):not(#direitos) { display: none; }` oculta as colunas de links secundários, mantendo o rodapé compacto e centralizado apenas com a marca, descrição e copyright.

---

### 4.2. Autenticação e Cadastros

### # `useLogin.ts`

* **O que faz:** Executa `signInWithEmailAndPassword` no Firebase Authentication. Com o `uid` retornado, busca o documento correspondente na coleção `users` do Firestore para descobrir o `tipo` da conta e o `endereco`. Salva a sessão ativa no `localStorage ("flashfoods:user")` e dispara o evento `perfilAtualizado`.

### # `useCadastro.ts`, `useCadastroEntregador.ts` e `useCadastroRestaurante.ts`

* **O que fazem:** Criam a conta segura no Firebase Authentication (com senha criptografada) e gravam os dados complementares no Firestore.
* **Particularidade do Restaurante:** O `useCadastroRestaurante.ts` realiza uma operação dupla: primeiro cria o documento da loja na coleção `restaurantes` (gerando o `restauranteId`) e depois grava o usuário na coleção `users` vinculando esse `restauranteId` ao perfil do proprietário.

---

### 4.3. Fluxo de Compra (Cliente)

### # `usePedirAgora.ts` & `pedir_agora.css`

* **O que faz:** Busca todos os estabelecimentos da coleção `restaurantes` do Firestore (`getDocs`) e extrai os arrays `produtos` de cada loja para montar a vitrine unificada de pratos.
* **Filtros:** Filtra simultaneamente por busca textual (`busca`), restaurante selecionado (`restauranteSelecionado`) e categoria (`categoria` com normalização de acentos e sinônimos, como "Hambúrguer" e "Lanches").
* **Responsividade (`pedir_agora.css`):** No mobile (`max-width: 650px`), transforma os botões de categoria e os cards de restaurantes em carrosséis horizontais deslizáveis (`overflow-x: auto`) e organiza os pratos em 1 coluna única.

### # `useCarrinhoPage.ts` & `carrinho.css`

* **O que faz:** Verifica se o usuário está logado; caso positivo, monta o objeto do pedido contendo os itens do `CarrinhoContext`, o endereço real cadastrado pelo cliente, o ID/nome do restaurante e grava um novo documento na coleção `pedidos` do Firestore com `status: "pendente"`.

---

### 4.4. Painel do Restaurante (`src/app/area-restaurante/`)

### # `useAreaRestaurante.ts`

* **O que faz:** Protege a rota exigindo `tipo === "restaurante"`. Consulta a coleção restaurantes filtrando por `usuarioId == usuarioLogado.id` para carregar os dados da loja e consulta a coleção pedidos filtrando por restauranteId para alimentar os indicadores da VisaoGeral.tsx.

**Componentes da tela:** `Produtos.tsx`, `Pedidos.tsx`, `Perfil.tsx` e `VisaoGeral.tsx`.

* **`Produtos.tsx`:** Permite criar, editar, pausar (switch ativo/inativo) e excluir pratos. Toda alteração atualiza o array produtos no documento da loja via updateDoc.
* **Pedidos.tsx:** Atualiza a fila de pedidos da cozinha a cada 7 segundos (setInterval). Ao clicar em um card, avança o status no Firestore seguindo a esteira: pendente ➔ preparando ➔ a caminho ➔ concluido.
* **Perfil.tsx:** Atualiza nome fantasia, CNPJ, categoria e endereço comercial da loja no Firestore via updateDoc.
* **VisaoGeral.tsx:** Componente puramente visual que calcula em tempo real a receita do dia, pedidos ativos, ticket médio e produtos mais vendidos a partir das props recebidas.

### 4.5. Painel do Entregador (src/app/area-entregador/)

### # `useAreaEFunctions.ts & MapsGps.tsx`

* **O que faz:** Motor operacional do entregador.
* **Como funciona o entregaAtual:**
1. `carregarCorridasDisponiveis()` busca em paralelo as coleções pedidos e restaurantes, cruzando o restauranteId para obter o endereço real de coleta da loja e filtrando apenas pedidos com status "preparando" ou "a caminho".
2. Ao clicar em **Aceitar Entrega** (`aceitarEntrega`), o status do pedido muda para "a caminho" no Firestore e o objeto do pedido é salvo no estado entregaAtual.
3. O `page.tsx` detecta que entregaAtual deixou de ser null, oculta a lista de corridas disponíveis e renderiza o componente MapsGps.tsx passando entregaAtual via props.
4. Ao clicar em **Confirmar Entrega** (`finalizarEntrega`), o status muda para "concluido" no Firestore, o valor do frete é somado aos ganhosHoje e entregaAtual volta para null.

### 4.6. Perfil e Histórico (src/app/perfil/)

### #`usePerfil.ts & HistoricoPedido.tsx`

* **usePerfil.ts:** Carrega os dados do documento do usuário na coleção users e permite atualizar name, phone, cpf e endereco via updateDoc, sincronizando também a sessão no localStorage.
* **HistoricoPedido.tsx:** Consulta a coleção pedidos do Firestore utilizando query e where: se for entregador, lista corridas com `status == "concluido"`; se for cliente, lista os pedidos onde `usuarioId == usuarioLogado.id`.

### 5. Guia de Manutenção para a Equipe (Onde editar sem quebrar o sistema?)

Para colegas que desejam contribuir com ajustes visuais, textos ou novas páginas:
1. **Regra de ouro:** Nunca altere arquivos dentro de src/services/ ou hooks/ se o objetivo for apenas mudar aparência, cores ou textos.
2. **Alterando cores, fontes e espaçamentos:**
   - Abra o arquivo `.css` ou `.module.css` da tela desejada.
     Sempre verifique o final do arquivo CSS. As regras dentro de @media (max-width: 600px) ou @media (max-width: 768px) controlam exclusivamente a visualização em celulares.
3. **Alterando textos e ícones:**
   - Abra o `page.tsx` ou o componente específico na pasta `components/`.
	• Altere livremente os textos entre tags HTML (`<h1>`, `<p>`, `<span>`), mas mantenha intactas as expressões entre chaves `{variavel}` e os atributos `onClick={funcao}` ou `onChange={funcao}`.
