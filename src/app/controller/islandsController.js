angular.module('moaiApp').controller('IslandsController', function($scope, $http, $q, $timeout, $location, API_CONFIG, AuthService) {
    // Aplicar a classe islands-page ao corpo para o espaçamento correto
    angular.element(document.body).addClass('islands-page');

    // Remover a classe quando sair da página
    $scope.$on('$destroy', function() {
        angular.element(document.body).removeClass('islands-page');
    });

    // Verificação de autenticação usando o serviço
    if (!AuthService.checkAuthentication()) {
        console.log("Autenticação falhou - redirecionando para login");
        return; // O serviço já redireciona para login
    }

    console.log("Autenticação bem sucedida - carregando ilhas");

    // Inicialização das variáveis
    $scope.challenges = [];
    $scope.seasons = [];
    $scope.filteredChallenges = [];
    $scope.filteredSeasons = [];
    $scope.loading = true;
    $scope.error = null;
    $scope.modalVisible = false;
    $scope.selectedIsland = null;
    $scope.selectedIslandKey = null;

    // Inicialização das variáveis para ilhas específicas
    $scope.challengesApi = {};
    $scope.seasonsApi = {};
    $scope.isLoadingChallenges = false;
    $scope.isLoadingSeasons = false;
    $scope.hasActiveSeasonByIsland = {};
    $scope.activeTab = 'challenges';

    // Mapeamento de ilhas para informações
    $scope.islands = {
        marketing: {
            name: 'Marketing e Vendas',
            description: 'Estratégias para atrair e converter clientes'
        },
        leadership: {
            name: 'Gestão e Liderança',
            description: 'Desenvolvimento de habilidades de liderança e gestão'
        },
        innovation: {
            name: 'Inovação e Tecnologia',
            description: 'Tecnologias e inovações para transformar seu negócio'
        },
        customer: {
            name: 'Experiência do Cliente',
            description: 'Estratégias para melhorar a experiência do cliente'
        },
        financial: {
            name: 'Gestão Financeira',
            description: 'Aprenda a gerir as finanças de seu negócio'
        }
    };

    // Mapeamento de níveis de maturidade - atualizado para refletir os valores corretos
    $scope.maturityLevelMap = {
        1: 'Fast Track',
        2: 'Executivo',
        3: 'C-Level',
        4: 'High-End'
    };

    // Mapeamento de IDs de níveis para texto
    $scope.levelMap = {
        "682755212327f74f3a3d74e1": "Nível 1",
        "682755472327f74f3a3d74eb": "Nível 2",
        "682755582327f74f3a3d74ef": "Nível 3",
        "6827556b2327f74f3a3d74f7": "Nível 4",
        "682755752327f74f3a3d74f8": "Nível 5",
        "682755802327f74f3a3d74fa": "Nível 6",
        "6827558b2327f74f3a3d74fc": "Nível 7"
    };

    // Números dos níveis para comparação
    $scope.levelNumberMap = {
        "682755212327f74f3a3d74e1": 1,
        "682755472327f74f3a3d74eb": 2,
        "682755582327f74f3a3d74ef": 3,
        "6827556b2327f74f3a3d74f7": 4,
        "682755752327f74f3a3d74f8": 5,
        "682755802327f74f3a3d74fa": 6,
        "6827558b2327f74f3a3d74fc": 7
    };

    // Obter o nível de maturidade do usuário
    $scope.user = {
        maturity: 1 // Valor padrão
    };

    // Obter nível atual do usuário
    $scope.userLevel = {
        id: null,
        number: 1
    };

    // Carregar nível de maturidade e nível do usuário a partir do status
    $scope.loadUserMaturity = function() {
        var userId = AuthService.getUserId();

        var req = {
            method: 'GET',
            url: API_CONFIG.baseUrl + '/player/' + userId + '/status',
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        $http(req).then(
            function(response) {
                console.log('Status do usuário carregado:', response.data);
                // Salvar maturidade
                if (response.data.extra && response.data.extra.maturity !== undefined) {
                    $scope.user.maturity = parseInt(response.data.extra.maturity) || 1;
                }

                // Salvar nível
                if (response.data.level && response.data.level._id) {
                    $scope.userLevel.id = response.data.level._id;
                    $scope.userLevel.number = $scope.levelNumberMap[$scope.userLevel.id] || 1;
                    console.log('Nível do usuário:', $scope.userLevel);
                }

                // Filtrar desafios e temporadas após obter o nível de maturidade
                filterChallengesByMaturity();
                filterSeasonsByMaturity();
            },
            function(error) {
                console.error('Falha ao carregar status do usuário:', error);
            }
        );
    };

    // Função para carregar desafios
    function loadChallenges() {
        var req = {
            method: 'GET',
            url: API_CONFIG.baseUrl + '/challenge',
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        return $http(req).then(
            function (response) {
                $scope.challenges = response.data || [];
                filterChallengesByMaturity();
                console.log('Desafios carregados:', $scope.challenges);
            },
            function (error) {
                console.error('Erro ao carregar desafios:', error);
                $scope.error = 'Erro ao carregar desafios';
            }
        );
    }

    // Função para carregar temporadas
    function loadSeasons() {
        var req = {
            method: 'GET',
            url: API_CONFIG.baseUrl + '/competition',
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        return $http(req).then(
            function (response) {
                $scope.seasons = response.data || [];
                filterSeasonsByMaturity();
                console.log('Temporadas carregadas:', $scope.seasons);

                // Inicializar dados de ilha
                Object.keys($scope.islands).forEach(function(key) {
                    if (!$scope.hasActiveSeasonByIsland[key]) {
                        $scope.hasActiveSeasonByIsland[key] = false;
                    }
                });
            },
            function (error) {
                console.error('Erro ao carregar temporadas:', error);
                $scope.error = 'Erro ao carregar temporadas';
            }
        );
    }

    // Filtrar desafios por nível de maturidade
    function filterChallengesByMaturity() {
        $scope.filteredChallenges = $scope.challenges.filter(function(challenge) {
            return challenge.extra && challenge.extra.maturity === $scope.user.maturity;
        });
    }

    // Filtrar temporadas por nível de maturidade
    function filterSeasonsByMaturity() {
        $scope.filteredSeasons = $scope.seasons.filter(function(season) {
            // Verificar se a temporada tem requisitos de maturidade
            var maturityMatch = true;
            if (season.extra && season.extra.maturity !== undefined) {
                maturityMatch = $scope.user.maturity >= season.extra.maturity;
            }

            // Verificar requisitos de nível, se existirem
            var levelMatch = true;
            if (season.requires && Array.isArray(season.requires)) {
                // Procurar requisitos de nível (type 3)
                var levelRequirements = season.requires.filter(function(req) {
                    return req.type === 3; // Requisito de nível
                });

                if (levelRequirements.length > 0) {
                    // Verificar se o usuário atende a pelo menos um dos requisitos de nível
                    levelMatch = levelRequirements.some(function(req) {
                        var requiredLevelId = req.item;
                        var requiredLevelNumber = $scope.levelNumberMap[requiredLevelId] || 1;
                        return $scope.userLevel.number >= requiredLevelNumber;
                    });
                }
            }

            return maturityMatch && levelMatch;
        });
    }

    // Função para abrir o modal da ilha
    $scope.openIslandModal = function(islandKey) {
        console.log('Abrindo modal para ilha:', islandKey);
        $scope.selectedIslandKey = islandKey;
        $scope.selectedIsland = $scope.islands[islandKey];
        $scope.activeTab = 'challenges'; // Inicia na aba de desafios
        $scope.modalVisible = true;

        // Carregar dados específicos da ilha
        $scope.loadIslandData(islandKey);

        // Garantir que a página role para o topo quando o modal abrir
        setTimeout(function() {
            window.scrollTo(0, 0);
            document.body.style.overflow = 'hidden';

            // Ativar a primeira aba (challenges)
            var firstTab = document.getElementById('challenges-tab');
            if (firstTab) {
                firstTab.click();
            }
        }, 100);
    };

    // Função para fechar o modal
    $scope.closeModal = function() {
        $scope.modalVisible = false;
        document.body.style.overflow = '';
        $scope.selectedIsland = null;
        $scope.selectedIslandKey = null;
    };

    // Função para alternar entre abas
    $scope.setActiveTab = function(tabName) {
        $scope.activeTab = tabName;

        // Se a tab é ranking e há uma ilha selecionada, carregar o ranking
        if (tabName === 'ranking' && $scope.selectedIslandKey) {
            var activeSeason = $scope.getActiveSeasonForCurrentIsland();
            if (activeSeason) {
                $scope.loadSeasonRanking(activeSeason._id);
            } else {
                // Limpar dados do ranking se não houver temporada ativa
                $scope.seasonRanking = [];
                $scope.userRankingPosition = null;
                $scope.hasActiveSeason = false;
            }
        }
    };

    // Função para carregar dados da ilha específica (desafios e temporadas)
    $scope.loadIslandData = function(islandKey) {
        // Carregar desafios da ilha
        $scope.loadIslandChallenges(islandKey);

        // Carregar temporadas da ilha
        $scope.loadIslandSeasons(islandKey);

        // Se houver temporada ativa, carregar o ranking
        // Isso será atualizado quando as temporadas forem carregadas
    };

    // Função para carregar desafios específicos da ilha - modificada para reconhecer os desafios de marketing
    $scope.loadIslandChallenges = function(islandKey) {
        $scope.isLoadingChallenges = true;

        if (!$scope.challengesApi[islandKey]) {
            $scope.challengesApi[islandKey] = [];
        }

        var req = {
            method: 'GET',
            url: API_CONFIG.baseUrl + '/challenge',
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        $http(req).then(
            function(response) {
                console.log('Todos os desafios carregados para ' + islandKey + ':', response.data);

                // Palavras-chave para associar desafios a ilhas
                var keywordMapping = {
                    'marketing': ['vendas', 'marketing', 'cliente', 'funil', 'proposta de valor'],
                    'leadership': ['liderança', 'gestão', 'equipe', 'reunião'],
                    'innovation': ['inovação', 'tecnologia', 'digital'],
                    'customer': ['experiência', 'cliente', 'atendimento'],
                    'financial': ['financeira', 'finanças', 'custo', 'orçamento']
                };

                // Filtrar desafios para a ilha específica
                var islandChallenges = response.data.filter(function(challenge) {
                    // Verificar se pertence à ilha específica
                    var belongsToIsland = false;

                    // 1. Verificar nas propriedades extra - método original
                    if (challenge.extra && challenge.extra.island === islandKey) {
                        belongsToIsland = true;
                    }

                    // 2. Verificar também se há um mapeamento explícito
                    if (!belongsToIsland && challenge.extra && challenge.extra.islandMap && challenge.extra.islandMap[islandKey]) {
                        belongsToIsland = true;
                    }

                    // 3. Nova regra: Se é a ilha de marketing e não foi encontrado um mapeamento,
                    // assumir que todos os desafios são para marketing por ser a ilha padrão
                    if (!belongsToIsland && islandKey === "marketing") {
                        belongsToIsland = true;
                    }

                    // 4. Nova regra: Verificar palavras-chave no título ou descrição
                    if (!belongsToIsland && challenge.challenge) {
                        var challengeText = (challenge.challenge + ' ' + (challenge.description || '')).toLowerCase();
                        var keywords = keywordMapping[islandKey] || [];

                        belongsToIsland = keywords.some(function(keyword) {
                            return challengeText.includes(keyword.toLowerCase());
                        });
                    }

                    // Log detalhado para depuração
                    if (islandKey === "marketing") {
                        console.log('Desafio ' + challenge.challenge + ' pertence à ilha ' + islandKey + '?', belongsToIsland);
                        if (belongsToIsland) {
                            console.log('👍 Desafio associado à ilha ' + islandKey);
                        }
                    }

                    // Verificar compatibilidade de nível de maturidade
                    var maturityMatch = true;
                    if (challenge.extra && challenge.extra.maturity !== undefined) {
                        maturityMatch = $scope.user.maturity >= challenge.extra.maturity;
                    }

                    // Verificar se é um desafio ativo
                    var isActive = challenge.active !== false;

                    return belongsToIsland && maturityMatch && isActive;
                });

                $scope.challengesApi[islandKey] = islandChallenges;
                $scope.isLoadingChallenges = false;

                console.log('Desafios da ilha de ' + islandKey + ' após filtragem:', $scope.challengesApi[islandKey].length);
            },
            function(error) {
                console.error('Erro ao carregar desafios da ilha ' + islandKey + ':', error);
                $scope.isLoadingChallenges = false;
                $scope.challengesApi[islandKey] = [];
            }
        );
    };

    // Função para carregar temporadas específicas da ilha
    $scope.loadIslandSeasons = function(islandKey) {
        $scope.isLoadingSeasons = true;

        if (!$scope.seasonsApi[islandKey]) {
            $scope.seasonsApi[islandKey] = [];
        }

        var req = {
            method: 'GET',
            url: API_CONFIG.baseUrl + '/competition',
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        $http(req).then(
            function(response) {
                // Filtrar apenas as temporadas associadas à ilha atual
                var allSeasons = response.data || [];
                console.log('Todas as temporadas disponíveis:', allSeasons);

                var islandSeasons = allSeasons.filter(function(season) {
                    // Verificar se a ilha está especificada nas informações extra da temporada
                    if (season.extra && season.extra.island === islandKey) {
                        return true;
                    }

                    // Caso contrário, usar o mapeamento de IDs para determinar a ilha
                    var belongsToIsland = $scope.seasonToIslandMap[season._id] === islandKey;
                    console.log('Temporada', season._id, 'pertence à ilha', islandKey, ':', belongsToIsland);
                    return belongsToIsland;
                });

                $scope.seasonsApi[islandKey] = islandSeasons;
                $scope.isLoadingSeasons = false;

                // Verificar se há temporada ativa
                var activeSeason = null;
                $scope.hasActiveSeasonByIsland[islandKey] = false;

                for (var i = 0; i < $scope.seasonsApi[islandKey].length; i++) {
                    var season = $scope.seasonsApi[islandKey][i];
                    if ($scope.isSeasonActive(season)) {
                        activeSeason = season;
                        $scope.hasActiveSeasonByIsland[islandKey] = true;
                        break;
                    }
                }

                // Se estamos na tab de ranking e há uma temporada ativa, carregar o ranking
                if ($scope.selectedIslandKey === islandKey && $scope.activeTab === 'ranking' && activeSeason) {
                    $scope.loadSeasonRanking(activeSeason._id);
                }

                console.log('Temporadas carregadas para ilha ' + islandKey + ':', $scope.seasonsApi[islandKey]);
            },
            function(error) {
                console.error('Erro ao carregar temporadas da ilha ' + islandKey + ':', error);
                $scope.isLoadingSeasons = false;
            }
        );
    };

    // Adicionar mapeamento para associar temporadas às ilhas corretas
    $scope.seasonToIslandMap = {
        "first": "marketing",    // Temporada de Vendas Essenciais -> Marketing e Vendas
        "second": "financial",   // Temporada de Saúde Financeira -> Gestão Financeira
        "third": "leadership",   // Temporada de Cultura e Liderança Consciente -> Gestão e Liderança
        "fourth": "innovation"   // Temporada da Excelência -> Inovação e Tecnologia
    };

    // Função para obter a temporada ativa para a ilha atual
    $scope.getActiveSeasonForCurrentIsland = function() {
        if (!$scope.selectedIslandKey || !$scope.seasonsApi[$scope.selectedIslandKey]) {
            return null;
        }

        var seasons = $scope.seasonsApi[$scope.selectedIslandKey];
        for (var i = 0; i < seasons.length; i++) {
            if ($scope.isSeasonActive(seasons[i])) {
                return seasons[i];
            }
        }

        return seasons.length > 0 ? seasons[0] : null;
    };

    // Função para obter descrição das recompensas
    $scope.getRewardDescription = function(reward) {
        const rewardTypes = {
            0: 'Moeda', // Baseado nos dados fornecidos
            1: 'Item',
            2: 'Conquista',
            3: 'Experiência'
        };

        const rewardItems = {
            'moaicoins': 'Moai Coins',
            'moaimoney': 'Moai Money',
            'xp': 'Experiência'
        };

        const itemName = rewardItems[reward.item] || reward.item;
        const type = rewardTypes[reward.type] || 'Recompensa';

        return `${reward.total} ${itemName}`;
    };

    // Função para verificar se uma temporada está ativa
    $scope.isSeasonActive = function(season) {
        if (!season || !season.period) return false;

        const now = Date.now();
        return season.period &&
               season.period.startDate <= now &&
               season.period.endDate >= now &&
               season.active;
    };

    // Função para formatar data
    $scope.formatDate = function(timestamp) {
        if (!timestamp) return 'Data não definida';
        return new Date(timestamp).toLocaleDateString('pt-BR');
    };

    // Função para calcular tempo restante de uma temporada
    $scope.getTimeRemaining = function(endDate) {
        if (!endDate) return 'Tempo indefinido';

        const now = Date.now();
        const timeLeft = endDate - now;

        if (timeLeft <= 0) return 'Expirado';

        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) {
            return `${days} dias e ${hours} horas restantes`;
        } else {
            return `${hours} horas restantes`;
        }
    };

    // Função para verificar se o usuário atende aos requisitos
    $scope.meetsRequirements = function() {
        // Implementar lógica de verificação de requisitos
        return true; // Por enquanto sempre retorna true
    };

    // Função para navegar para o dashboard
    $scope.navigateToDashboard = function() {
        $location.path('/dashboard');
    };

    // Função para atualizar o nível de maturidade do usuário
    $scope.updateUserMaturity = function(newMaturity) {
        $scope.user.maturity = newMaturity;
        filterChallengesByMaturity();
        filterSeasonsByMaturity();
    };

    // Função para recarregar dados
    $scope.refreshData = function() {
        $scope.loading = true;
        $scope.error = null;

        // Usar $q.all para tratar promises
        $q.all([loadChallenges(), loadSeasons()])
            .then(function() {
                $scope.loading = false;

                // Inicializar dados para todas as ilhas
                var islandKeys = Object.keys($scope.islands);
                islandKeys.forEach(function(key) {
                    if (!$scope.challengesApi[key]) {
                        $scope.challengesApi[key] = [];
                    }
                    if (!$scope.seasonsApi[key]) {
                        $scope.seasonsApi[key] = [];
                    }
                    $scope.hasActiveSeasonByIsland[key] = false;
                });

                // Não chamar loadJoinedChallenges aqui
            })
            .catch(function(error) {
                $scope.loading = false;
                $scope.error = 'Erro ao carregar dados';
            });
    };

    // Função para obter pontos totais de um desafio
    $scope.getTotalPoints = function(challenge) {
        if (!challenge.points || !Array.isArray(challenge.points)) return 0;

        return challenge.points.reduce(function(total, point) {
            return total + (point.total || 0);
        }, 0);
    };

    // Função para obter categorias de pontos
    $scope.getPointCategories = function(challenge) {
        if (!challenge.points || !Array.isArray(challenge.points)) return [];

        return challenge.points.map(function(point) {
            return {
                category: point.category || 'xp',
                total: point.total || 0
            };
        });
    };

    // Função para obter ícone do tema
    $scope.getThemeIcon = function(islandKey) {
        var icons = {
            'marketing': 'bi-megaphone-fill',
            'leadership': 'bi-person-fill',
            'innovation': 'bi-lightbulb-fill',
            'customer': 'bi-people-fill',
            'financial': 'bi-cash-coin'
        };

        return icons[islandKey] || 'bi-star-fill';
    };

    // Variável para controlar estado de carregamento ao entrar em temporada
    $scope.isJoiningSeason = false;

    // Variável para armazenar temporadas em que o jogador já participa
    $scope.playerJoinedSeasons = [];

    // Carregar temporadas que o jogador já participa
    $scope.loadPlayerJoinedSeasons = function() {
        // If we're already loading, don't start another request
        if ($scope.isLoadingPlayerSeasons) return;

        $scope.isLoadingPlayerSeasons = true;
        var userId = AuthService.getUserId();

        if (!userId) {
            console.warn('Usuário não autenticado, não é possível carregar temporadas.');
            $scope.isLoadingPlayerSeasons = false;
            return;
        }

        var req = {
            method: 'GET',
            url: API_CONFIG.baseUrl + '/competition/player/' + userId,
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        $http(req).then(
            function(response) {
                $scope.isLoadingPlayerSeasons = false;
                console.log('Temporadas do jogador carregadas:', response.data);

                // Ensure response.data is always treated as an array
                if (response.data && Array.isArray(response.data)) {
                    $scope.playerJoinedSeasons = response.data;
                } else if (response.data && typeof response.data === 'object') {
                    // If it's an object but not an array, check if it contains an array property
                    let foundArray = false;
                    Object.keys(response.data).forEach(function(key) {
                        if (Array.isArray(response.data[key])) {
                            console.log('Found array property in response.data:', key);
                            $scope.playerJoinedSeasons = response.data[key];
                            foundArray = true;
                        }
                    });

                    if (!foundArray) {
                        // If no array found, convert the object to an array if possible
                        console.log('No array found in response, using empty array');
                        $scope.playerJoinedSeasons = [];
                    }
                } else {
                    // Default to empty array if data is invalid
                    console.log('Invalid response data, using empty array');
                    $scope.playerJoinedSeasons = [];
                }

                console.log('Processed playerJoinedSeasons:', $scope.playerJoinedSeasons);
            },
            function(error) {
                $scope.isLoadingPlayerSeasons = false;
                console.error('Erro ao carregar temporadas do jogador:', error);
                $scope.playerJoinedSeasons = [];
            }
        );
    };

    // Verificar se o jogador já participa de uma temporada
    $scope.isPlayerJoinedSeason = function(seasonId) {
        // Verificar argumentos válidos
        if (!seasonId) return false;
        if (!$scope.playerJoinedSeasons || !Array.isArray($scope.playerJoinedSeasons)) return false;

        // Usar o método some com uma função que trata campos nulos/indefinidos
        return $scope.playerJoinedSeasons.some(function(season) {
            return season && season.competition === seasonId;
        });
    };

    // Função para participar de uma temporada
    $scope.joinSeason = function(season) {
        if (!season || $scope.isJoiningSeason) return;

        // Verificar se o jogador já participa da temporada
        if ($scope.isPlayerJoinedSeason(season._id)) {
            console.log('Usuário já está participando desta temporada');
            return; // Não precisamos mostrar alerta pois o botão não deveria estar disponível
        }

        // Verificar se o usuário atende aos requisitos para participar
        if (!$scope.meetsSeasonRequirements(season)) {
            alert('Você não atende aos requisitos para participar desta temporada.');
            return;
        }

        $scope.isJoiningSeason = true;
        var userId = AuthService.getUserId();

        // Usar a API da Funifier para participar da temporada
        var req = {
            method: 'POST',
            url: 'https://service2.funifier.com/v3/competition/join',
            headers: {
                "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
                "Content-Type": "application/json"
            },
            data: {
                "competition": season._id,
                "player": userId
            }
        };

        $http(req).then(
            function(response) {
                console.log('Participação na temporada registrada com sucesso:', response.data);
                $scope.isJoiningSeason = false;

                // Adicionar à lista de temporadas do jogador
                $scope.playerJoinedSeasons.push({
                    competition: season._id,
                    player: userId,
                    joined: Date.now()
                });

                // Mostrar feedback de sucesso ao usuário
                alert('Você entrou com sucesso na temporada: ' + season.title);

                // Atualizar ranking caso esteja na aba de ranking
                if ($scope.activeTab === 'ranking') {
                    $scope.loadSeasonRanking(season._id);
                }
            },
            function(error) {
                console.error('Erro ao participar da temporada:', error);
                $scope.isJoiningSeason = false;

                var errorMsg = 'Não foi possível participar da temporada.';
                if (error && error.data && error.data.message) {
                    errorMsg += ' ' + error.data.message;
                }
                alert(errorMsg);
            }
        );
    };

    // Variáveis para o ranking da temporada
    $scope.seasonRanking = [];
    $scope.isLoadingRanking = false;
    $scope.rankingError = null;
    $scope.userRankingPosition = null;
    $scope.hasActiveSeason = false;

    // Carregar ranking da temporada atual
    $scope.loadSeasonRanking = function(seasonId) {
        if (!seasonId) {
            $scope.seasonRanking = [];
            $scope.userRankingPosition = null;
            $scope.hasActiveSeason = false;
            return;
        }

        $scope.isLoadingRanking = true;
        $scope.rankingError = null;
        $scope.hasActiveSeason = true;

        var userId = AuthService.getUserId();

        var req = {
            method: 'POST',
            url: 'https://service2.funifier.com/v3/competition/leader/aggregate?id=' + seasonId,
            headers: {
                "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
                "Content-Type": "application/json"
            },
            data: [] // Empty array as per the example
        };

        $http(req).then(
            function(response) {
                console.log('Ranking da temporada carregado:', response.data);
                $scope.seasonRanking = response.data || [];
                $scope.isLoadingRanking = false;

                // Encontrar posição do usuário atual no ranking
                $scope.userRankingPosition = $scope.seasonRanking.find(function(rank) {
                    return rank.player === userId;
                });

                // Pré-carregar nomes dos jogadores
                $scope.seasonRanking.forEach(function(rank) {
                    // Iniciar carregamento em background dos nomes
                    $scope.getPlayerDisplayName(rank.player);
                });

                console.log('Posição do usuário no ranking:', $scope.userRankingPosition);
                console.log('Total de jogadores no ranking:', $scope.seasonRanking.length);
            },
            function(error) {
                console.error('Erro ao carregar ranking da temporada:', error);
                $scope.isLoadingRanking = false;
                $scope.rankingError = error;
            }
        );
    };

    // Adicionar um cache para nomes de jogadores
    $scope.playerNameCache = {};

    // Função para obter nome do jogador para exibição no ranking
    $scope.getPlayerDisplayName = function(playerId) {
        // Se for o jogador atual, mostrar "Você"
        if (playerId === AuthService.getUserId()) {
            return "Você";
        }

        // Verificar cache primeiro
        if ($scope.playerNameCache[playerId]) {
            return $scope.playerNameCache[playerId];
        }

        // Se não estiver em cache, buscar o nome do jogador
        $scope.fetchPlayerName(playerId);

        // Retornar um placeholder enquanto carrega
        return "Jogador " + playerId.substring(0, 8);
    };

    // Função para buscar o nome do jogador na API
    $scope.fetchPlayerName = function(playerId) {
        // Se já estamos carregando este jogador, não iniciar nova requisição
        if ($scope.playerNameCache[playerId] === 'loading') {
            return;
        }

        // Marcar como em carregamento
        $scope.playerNameCache[playerId] = 'loading';

        var req = {
            method: 'GET',
            url: API_CONFIG.baseUrl + '/player/' + playerId,
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        $http(req).then(
            function(response) {
                var playerData = response.data;
                var displayName = "";

                // Definir nome para exibição baseado nos dados disponíveis
                if (playerData.name) {
                    // Usar nome completo se disponível
                    displayName = playerData.name;
                } else if (playerData.email) {
                    // Usar email se nome não estiver disponível
                    displayName = playerData.email.split('@')[0];
                } else {
                    // Usar ID curto como último recurso
                    displayName = "Jogador " + playerId.substring(0, 8);
                }

                // Atualizar cache
                $scope.playerNameCache[playerId] = displayName;

                // Forçar atualização da view
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            },
            function(error) {
                console.error('Erro ao carregar dados do jogador:', error);
                // Salvar um valor padrão no cache em caso de erro
                $scope.playerNameCache[playerId] = "Jogador " + playerId.substring(0, 8);

                // Forçar atualização da view
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }
        );
    };

    // Remover funções duplicadas ou redundantes
    // Já existe um método $scope.getActiveSeasonForCurrentIsland definido em dois lugares
    // Remover a segunda definição (linhas 1172-1189) e manter apenas esta:
    $scope.getActiveSeasonForCurrentIsland = function() {
        if (!$scope.selectedIslandKey || !$scope.seasonsApi[$scope.selectedIslandKey]) {
            return null;
        }

        var seasons = $scope.seasonsApi[$scope.selectedIslandKey];
        for (var i = 0; i < seasons.length; i++) {
            if ($scope.isSeasonActive(seasons[i])) {
                return seasons[i];
            }
        }

        return seasons.length > 0 ? seasons[0] : null;
    };

    // Corrigir o meetsSeasonRequirements - este método está sendo chamado frequentemente na view
    $scope.meetsSeasonRequirements = function(season) {
        if (!season) return false;

        // Adicionar cache para evitar recálculos desnecessários
        if (season._requirementsCache !== undefined) {
            return season._requirementsCache;
        }

        // Verificar requisitos de maturidade
        var maturityMatch = true;
        if (season.extra && season.extra.maturity !== undefined) {
            maturityMatch = $scope.user.maturity >= season.extra.maturity;
        }

        // Verificar requisitos de nível
        var levelMatch = true;
        if (season.requires && Array.isArray(season.requires)) {
            var levelRequirements = season.requires.filter(function(req) {
                return req.type === 3;
            });

            if (levelRequirements.length > 0) {
                levelMatch = levelRequirements.some(function(req) {
                    var requiredLevelId = req.item;
                    var requiredLevelNumber = $scope.levelNumberMap[requiredLevelId] || 999;
                    return $scope.userLevel.number >= requiredLevelNumber;
                });
            }
        }

        // Armazenar o resultado em cache
        season._requirementsCache = maturityMatch && levelMatch;
        return season._requirementsCache;
    };

    // Corrigir o método isPlayerJoinedSeason para garantir que não cause erros
    $scope.isPlayerJoinedSeason = function(seasonId) {
        // Verificar argumentos válidos
        if (!seasonId) return false;
        if (!$scope.playerJoinedSeasons || !Array.isArray($scope.playerJoinedSeasons)) return false;

        // Usar o método some com uma função que trata campos nulos/indefinidos
        return $scope.playerJoinedSeasons.some(function(season) {
            return season && season.competition === seasonId;
        });
    };

    // Corrigir o método formatTimeRemaining com tratamento mais robusto de erros
    $scope.formatTimeRemaining = function(season) {
        // Verificação robusta de parâmetro
        if (!season || !season.period || !season.period.endDate) return "Tempo indefinido";

        // Cache por 30 segundos em vez de 60 para reduzir erros de timeout
        if (season._timeRemainingCache !== undefined &&
            (Date.now() - (season._timeRemainingCacheTime || 0)) < 30000) {
            return season._timeRemainingCache;
        }

        var now = Date.now();
        var timeLeft = season.period.endDate - now;
        var result;

        if (timeLeft <= 0) {
            result = "Finalizada";
        } else {
            var days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            var hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            if (days > 0) {
                result = days + "d " + hours + "h restantes";
            } else {
                result = hours + " horas restantes";
            }
        }

        // Atualizar o cache
        season._timeRemainingCache = result;
        season._timeRemainingCacheTime = now;

        return result;
    };

    // Modifique a função para calcular o progresso da temporada com caching mais efetivo
    $scope.calculateSeasonProgress = function(season) {
        if (!season || !season.period) return 0;

        // Use uma chave de cache estável baseada em IDs em vez de objetos completos
        var cacheKey = 'progress_' + (season._id || 'unknown');

        // Usar cache estático para toda a sessão do usuário
        if (!$scope._progressCache) {
            $scope._progressCache = {};
            $scope._progressCacheTime = {};
        }

        // Verificar cache apenas a cada 60 segundos para evitar recálculos constantes
        var now = Date.now();
        if ($scope._progressCache[cacheKey] !== undefined &&
            (now - ($scope._progressCacheTime[cacheKey] || 0)) < 60000) {
            return $scope._progressCache[cacheKey];
        }

        // Se não houver valor em cache ou cache expirou, recalcular
        const start = season.period.startDate;
        const end = season.period.endDate;

        // Valores fixos para testes - remova depois se necessário
        // e substitua pelo cálculo real
        let progressValue;

        if ($scope.isSeasonActive(season)) {
            // Cálculo real do progresso
            const totalDuration = end - start;
            const elapsed = now - start;
            progressValue = Math.round((elapsed / totalDuration) * 100);

            // Garantir que o valor está entre 0 e 100
            progressValue = Math.min(100, Math.max(0, progressValue));
        } else if (now < start) {
            // Se a temporada não começou ainda
            progressValue = 0;
        } else {
            // Se a temporada já acabou
            progressValue = 100;
        }

        // Armazenar em cache com nova timestamp
        $scope._progressCache[cacheKey] = progressValue;
        $scope._progressCacheTime[cacheKey] = now;

        return progressValue;
    };

    // Função para formatar recompensas de um desafio de maneira mais legível
    $scope.formatReward = function(challenge) {
        if (!challenge || !challenge.points || !Array.isArray(challenge.points) || challenge.points.length === 0) {
            return "Sem recompensas";
        }

        // Mapear pontos para textos legíveis
        var rewardTexts = challenge.points.map(function(point) {
            var category = point.category || 'xp';
            var amount = point.total || 0;

            // Formatar com nomes amigáveis
            switch (category.toLowerCase()) {
                case 'moaicoins':
                    return amount + ' MOAIcoins';
                case 'moaimoney':
                    return amount + ' MOAImoney';
                case 'xp':
                    return amount + ' XP';
                default:
                    return amount + ' ' + category;
            }
        });

        // Juntar tudo em uma única string
        return rewardTexts.join(', ');
    };

    // Função para obter recompensas de uma temporada
    $scope.getSeasonRewards = function(season) {
        // Se não for fornecida uma temporada, retornar array vazio
        if (!season || !season.rewards) return [];

        console.log('Processando recompensas da temporada:', season.title);

        // Mapear as recompensas para um formato mais fácil de exibir
        return season.rewards.map(function(reward) {
            // Determinar a posição da recompensa
            var position = 0;
            if (reward.extra && reward.extra.position_start) {
                position = reward.extra.position_start;
            }

            // Informações padrão da recompensa
            var rewardInfo = {
                type: reward.type,
                item: reward.item,
                total: reward.total,
                position: position,
                amount: reward.total,
                description: reward.extra && reward.extra.description ? reward.extra.description : null
            };

            // Com base no tipo de recompensa, definir ícone, nome e classe
            switch(reward.type) {
                case 0: // Pontos/moedas
                    if (reward.item === 'moaicoins') {
                        rewardInfo.name = 'MOAIcoins';
                        rewardInfo.icon = '🏆';
                        rewardInfo.iconClass = 'reward-moaicoins';
                    } else if (reward.item === 'moaimoney') {
                        rewardInfo.name = 'MOAImoney';
                        rewardInfo.icon = '💰';
                        rewardInfo.iconClass = 'reward-moaimoney';
                    } else if (reward.item === 'xp') {
                        rewardInfo.name = 'Experiência';
                        rewardInfo.icon = '⭐';
                        rewardInfo.iconClass = 'reward-xp';
                    } else {
                        rewardInfo.name = reward.item;
                        rewardInfo.icon = '🎁';
                        rewardInfo.iconClass = 'reward-default';
                    }
                    break;

                case 1: // Item
                    rewardInfo.name = 'Item Exclusivo';
                    rewardInfo.icon = '🎁';
                    rewardInfo.iconClass = 'reward-item';
                    break;

                case 2: // Conquista
                    rewardInfo.name = 'Conquista Especial';
                    rewardInfo.icon = '🎖️';
                    rewardInfo.iconClass = 'reward-achievement';

                    // Se for a conquista específica da resposta da API
                    if (reward.item === 'EVwBmRm') {
                        rewardInfo.name = 'Conquista do Campeão';
                        rewardInfo.description = 'Uma recompensa misteriosa te espera!';
                    }
                    break;

                case 3: // Experiência
                    rewardInfo.name = 'Experiência';
                    rewardInfo.icon = '⭐';
                    rewardInfo.iconClass = 'reward-xp';
                    break;

                default:
                    rewardInfo.name = 'Recompensa';
                    rewardInfo.icon = '🎁';
                    rewardInfo.iconClass = 'reward-default';
            }

            return rewardInfo;
        });
    };

    // Inicialização modificada
    function init() {
        console.log('Inicializando Islands Controller...');
        $scope.loadUserMaturity();
        $scope.loadPlayerJoinedSeasons();
        loadChallengeStatus(); // Adicionar carregamento do estado dos desafios

        // Adicionar um atraso curto para garantir que o refreshData não cause loops
        $timeout(function() {
            $scope.refreshData();
        }, 100);
    }

    // Inicializar apenas uma vez
    init();

    // Atualizar o progresso da temporada sempre que a temporada ativa mudar
    $scope.$watch('selectedIslandKey', function(newVal, oldVal) {
        if (newVal !== oldVal) {
            // Aguardar um curto período para garantir que os dados da temporada sejam carregados
            $timeout(function() {
                var activeSeason = $scope.getActiveSeasonForCurrentIsland();
                if (activeSeason) {
                    // Calcular e armazenar o progresso da temporada
                    $scope.currentSeasonProgress = $scope.calculateSeasonProgress(activeSeason);
                }
            }, 100);
        }
    });

    // Função para verificar se o jogador pode participar de uma temporada
    $scope.canJoinSeason = function(season) {
        if (!season) return false;

        return $scope.isSeasonActive(season) && // Temporada está ativa
               $scope.meetsSeasonRequirements(season) && // Atende aos requisitos
               !$scope.isPlayerJoinedSeason(season._id) && // Não está participando ainda
               !$scope.isJoiningSeason; // Não está em processo de participação
    };

    // Inicializar a estrutura de desafios associados
$scope.joinedChallenges = {};
$scope.challengeExpires = {};

// Função para verificar se um desafio já foi iniciado/associado
$scope.isChallengeJoined = function(challengeId) {
    return $scope.joinedChallenges && $scope.joinedChallenges[challengeId] === true;
};

// Função para verificar se um desafio está expirado
$scope.isChallengeExpired = function(challengeId) {
    if (!$scope.challengeExpires || !$scope.challengeExpires[challengeId]) {
        return false;
    }

    var expiryDate = new Date($scope.challengeExpires[challengeId]);
    var now = new Date();

    return expiryDate < now;
};

// Função para formatar o tempo restante de um desafio
$scope.formatRemainingTime = function(challenge) {
    if (!challenge || !$scope.challengeExpires || !$scope.challengeExpires[challenge._id]) {
        return "Prazo indefinido";
    }

    var expiryDate = new Date($scope.challengeExpires[challenge._id]);
    var now = new Date();

    if (expiryDate <= now) {
        return "Expirado";
    }

    var timeLeft = expiryDate - now;
    var hours = Math.floor(timeLeft / (1000 * 60 * 60));
    var minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
        var days = Math.floor(hours / 24);
        hours = hours % 24;
        return days + "d " + hours + "h";
    }

    return hours + "h " + minutes + "m";
};

// Função simplificada para iniciar um desafio - agora usando extra.url para redirecionamento
$scope.startChallenge = function(challenge) {
    // Evitar múltiplos cliques
    if (challenge.isStarting === true) {
        console.log('Já está processando este desafio, ignorando clique duplicado');
        return;
    }

    // Verificar se o desafio já está iniciado
    if ($scope.joinedChallenges[challenge._id] === true) {
        console.log('Acessando desafio já iniciado:', challenge.challenge);

        // Redirecionar para URL personalizada se disponível, caso contrário, usar URL padrão
        var challengeUrl;
        if (challenge.extra && challenge.extra.url) {
            challengeUrl = challenge.extra.url;
            console.log('Redirecionando para URL personalizada:', challengeUrl);
        } else {
            challengeUrl = 'https://service2.funifier.com/v3/challenge/view/' + challenge._id;
            console.log('URL personalizada não encontrada. Usando URL padrão:', challengeUrl);
        }

        window.open(challengeUrl, '_blank');
        return;
    }

    // Marcar como processando
    challenge.isStarting = true;
    var userId = AuthService.getUserId();

    console.log('Iniciando desafio:', challenge.challenge);

    // Requisição para API
    var req = {
        method: 'POST',
        url: 'https://service2.funifier.com/v3/join',
        headers: {
            "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
            "Content-Type": "application/json"
        },
        data: {
            "player": userId,
            "item": challenge._id,
            "entity": "challenge"
        }
    };

    // Fazer a requisição
    $http(req)
        .then(function(response) {
            console.log('Desafio iniciado com sucesso:', response.data);

            // Atualizar estado localmente
            $scope.joinedChallenges[challenge._id] = true;

            // Também salvar no localStorage para persistir entre sessões
            try {
                var joinedChallenges = JSON.parse(localStorage.getItem('joinedChallenges') || '{}');
                joinedChallenges[challenge._id] = true;
                localStorage.setItem('joinedChallenges', JSON.stringify(joinedChallenges));
            } catch (e) {
                console.error('Erro ao salvar no localStorage:', e);
            }

            // Se houver informações de expiração
            if (response.data && response.data.expires) {
                $scope.challengeExpires[challenge._id] = response.data.expires;

                // Salvar também no localStorage
                try {
                    var challengeExpires = JSON.parse(localStorage.getItem('challengeExpires') || '{}');
                    challengeExpires[challenge._id] = response.data.expires;
                    localStorage.setItem('challengeExpires', JSON.stringify(challengeExpires));
                } catch (e) {
                    console.error('Erro ao salvar expiração no localStorage:', e);
                }
            } else if (challenge.join && challenge.join.timeframe) {
                var expiresIn = 0;
                var timeframeStr = String(challenge.join.timeframe);

                // Converter timeframe em milisegundos
                if (timeframeStr.includes('min')) {
                    expiresIn = parseInt(timeframeStr) * 60 * 1000;
                } else if (timeframeStr.includes('h')) {
                    expiresIn = parseInt(timeframeStr) * 60 * 60 * 1000;
                } else if (timeframeStr.includes('d')) {
                    expiresIn = parseInt(timeframeStr) * 24 * 60 * 60 * 1000;
                }

                if (expiresIn > 0) {
                    var expiryTime = Date.now() + expiresIn;
                    $scope.challengeExpires[challenge._id] = expiryTime;

                    // Salvar no localStorage
                    try {
                        var challengeExpires = JSON.parse(localStorage.getItem('challengeExpires') || '{}');
                        challengeExpires[challenge._id] = expiryTime;
                        localStorage.setItem('challengeExpires', JSON.stringify(challengeExpires));
                    } catch (e) {
                        console.error('Erro ao salvar expiração no localStorage:', e);
                    }
                }
            }

            // Resetar flag de processamento
            challenge.isStarting = false;

            // Redirecionar para o URL personalizado do desafio, se disponível
            $timeout(function() {
                var url;
                if (challenge.extra && challenge.extra.url) {
                    url = challenge.extra.url;
                    console.log('Redirecionando para URL personalizada após aceitar desafio:', url);
                } else {
                    url = 'https://service2.funifier.com/v3/challenge/view/' + challenge._id;
                    console.log('URL personalizada não encontrada. Usando URL padrão após aceitar:', url);
                }
                window.open(url, '_blank');
            }, 100);
        })
        .catch(function(error) {
            console.error('Erro ao iniciar desafio:', error);
            challenge.isStarting = false;

            var errorMsg = 'Não foi possível iniciar o desafio.';
            if (error && error.data && error.data.message) {
                errorMsg += ' ' + error.data.message;
            }
            alert(errorMsg);
        });
};

// Função para carregar o estado dos desafios do localStorage quando a página é carregada
function loadChallengeStatus() {
    try {
        var joinedChallenges = JSON.parse(localStorage.getItem('joinedChallenges') || '{}');
        var challengeExpires = JSON.parse(localStorage.getItem('challengeExpires') || '{}');

        $scope.joinedChallenges = joinedChallenges;
        $scope.challengeExpires = challengeExpires;

        console.log('Status de desafios carregado do localStorage:',
                    Object.keys(joinedChallenges).length, 'desafios aceitos');
    } catch (e) {
        console.error('Erro ao carregar estado dos desafios:', e);
        $scope.joinedChallenges = {};
        $scope.challengeExpires = {};
    }
}

// Atualizar a função init para carregar o estado dos desafios
function init() {
    console.log('Inicializando Islands Controller...');
    $scope.loadUserMaturity();
    $scope.loadPlayerJoinedSeasons();
    loadChallengeStatus(); // Adicionar carregamento do estado dos desafios

    // Adicionar um atraso curto para garantir que o refreshData não cause loops
    $timeout(function() {
        $scope.refreshData();
    }, 100);
}
});
