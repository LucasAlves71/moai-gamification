# MOAI Gamification

## Visão Geral

O MOAI Gamification é uma plataforma web baseada em AngularJS que implementa elementos de gamificação em torno do conceito de MOAI, uma referência às famosas estátuas da Ilha de Páscoa. O projeto utiliza uma arquitetura MVC (Model-View-Controller) típica de aplicações AngularJS e se comunica com uma API RESTful da Funifier para gerenciar dados de jogadores, conquistas, itens virtuais e outros elementos de gamificação.

## Estrutura do Projeto
/
|- .vscode/                # Configurações do VS Code
|- src/                    # Código-fonte da aplicação
|   |- app/                # Lógica principal da aplicação
|   |   |- controller/     # Controladores Angular
|   |   |- directives/     # Diretivas personalizadas
|   |   |- services/       # Serviços compartilhados
|   |- components/         # Componentes reutilizáveis
|   |- public/             # Recursos estáticos
|   |   |- audios/         # Arquivos de áudio
|   |   |- img/            # Imagens e ícones
|   |- views/              # Telas da aplicação
|   |   |- dashboard/      # Tela principal
|   |   |- development/    # Área de desenvolvimento
|   |   |- firstupgrade/   # Primeira evolução do MOAI
|   |   |- islands/        # Ilhas de conhecimento
|   |   |- login/          # Tela de login
|   |   |- onboarding/     # Processo de integração
|   |   |- profile/        # Perfil do usuário
|   |   |- rewards/        # Recompensas e loja
|   |- app.js              # Configuração principal do Angular
|   |- index.html          # Página principal
|   |- styles.css          # Estilos globais


## Principais Funcionalidades

### 1. Sistema de Gamificação
- **Níveis e Progressão**: Os usuários progridem através de níveis, ganhando experiência (XP) ao completar desafios.
- **Recursos**: Os jogadores coletam diferentes recursos (Energia, Ferramenta, Criatividade) que são usados para evoluir seu MOAI.
- **Moedas Virtuais**: MOAIcoins e MOAImoney são usados para comprar itens na loja de recompensas.

### 2. Evolução MOAI
- Os jogadores começam com uma ilha vazia e constroem seu MOAI em estágios, adicionando elementos como base, olhos, nariz, etc.
- Cada evolução requer recursos específicos e representa o progresso do jogador.

### 3. Ilhas de Conhecimento
- Diferentes ilhas temáticas representam áreas de conhecimento/especialização.
- Cada ilha contém desafios e temporadas com recompensas específicas.

### 4. Área de Desenvolvimento
- Os jogadores geram recursos através de atividades como:
  - Participação em eventos (gera Energia)
  - Compartilhamento de insights (gera Ferramentas)
  - Leitura e estudo (gera Criatividade)

### 5. Sistema de Recompensas
- Loja onde os jogadores podem trocar moedas virtuais por recompensas.
- Histórico de compras e visualização de itens disponíveis.

## Tecnologias Utilizadas

- **Frontend**: AngularJS (versão 1.8.2), Bootstrap 5, HTML5, CSS3
- **Comunicação Backend**: Requisições HTTP para API RESTful da Funifier
- **Autenticação**: Sistema básico de autenticação com tokens
- **Armazenamento Local**: localStorage para persistência entre sessões
- **Mídia**: Áudio e efeitos visuais para feedback ao usuário

## Fluxo do Usuário

1. Login: Autenticação no sistema
2. Onboarding: Introdução ao conceito do jogo com o guia Manu'Kai
3. Primeira Evolução: Tutorial guiado para adquirir a primeira pedra MOAI
4. Dashboard: Hub central com visualização do MOAI e acesso às funcionalidades
5. Desenvolvimento: Geração de recursos através de atividades
6. Ilhas: Participação em desafios e temporadas
7. Loja de Recompensas: Aquisição de itens virtuais
