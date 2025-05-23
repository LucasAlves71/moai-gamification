angular.module('moaiApp').controller('DashboardController', function($scope, $http, $location, API_CONFIG, AuthService, $timeout) {
    // Aplicar a classe dashboard-page ao corpo para o espaçamento correto
    angular.element(document.body).addClass('dashboard-page');

    // Remover a classe quando sair da página
    $scope.$on('$destroy', function() {
        angular.element(document.body).removeClass('dashboard-page');
    });

    // No início de cada controller protegido
    if (!AuthService.checkAuthentication()) {
        return;
    }

    // Initialize user status
    $scope.userStatus = {
        name: '',
        total_points: 0,
        pointCategories: {},
        level: { level: 'Nível 1' },
        level_progress: {
            percent: 0,
            next_points: 25,
            next_level: { level: 'Nível 2' }
        },
        extra: {
            maturity: 0,
            ilha: 'Carregando...'
        }
    };

    // Função para converter o valor numérico de maturity para texto
    $scope.getMaturityText = function(maturityLevel) {
        switch(parseInt(maturityLevel)) {
            case 1:
                return "Fast Track";
            case 2:
                return "Executivo";
            case 3:
                return "C-Level";
            case 4:
                return "High-End";
            default:
                return "Desconhecido";
        }
    };

    // Função para calcular a porcentagem de progresso do nível atual
    $scope.calculateLevelProgress = function() {
        if (!$scope.userStatus) return 0;

        console.log("Calculando progresso:", {
            pointCategories: $scope.userStatus.pointCategories,
            xp: $scope.userStatus.pointCategories ? $scope.userStatus.pointCategories.xp : undefined,
            level: $scope.userStatus.level,
            level_progress: $scope.userStatus.level_progress
        });

        // Verificar se temos os dados necessários
        if (!$scope.userStatus.pointCategories ||
            !$scope.userStatus.level_progress ||
            !$scope.userStatus.level_progress.next_level) {
            console.log("Dados insuficientes para calcular progresso");
            return 0;
        }

        // Obter pontos atuais (XP)
        var currentPoints = $scope.userStatus.pointCategories.xp || 0;
        console.log("Pontos atuais:", currentPoints);

        // Pontos necessários para o próximo nível
        var nextLevelPoints = $scope.userStatus.level_progress.next_level.minPoints || 25;
        console.log("Pontos para próximo nível:", nextLevelPoints);

        // Pontos do nível atual
        var currentLevelPoints = $scope.userStatus.level && $scope.userStatus.level.minPoints ?
                                 $scope.userStatus.level.minPoints : 0;
        console.log("Pontos do nível atual:", currentLevelPoints);

        // Verificar se os valores são válidos para cálculo
        if (isNaN(currentPoints) || isNaN(nextLevelPoints) || isNaN(currentLevelPoints)) {
            console.log("Valores inválidos para cálculo");
            return 0;
        }

        // Se os pontos para o próximo nível forem zero ou inferiores ao nível atual,
        // consideramos que não há progresso a ser mostrado
        if (nextLevelPoints <= currentLevelPoints || nextLevelPoints <= 0) {
            console.log("Próximo nível inválido ou igual ao atual");
            return 0;
        }

        // Se os pontos atuais são maiores que os pontos do próximo nível,
        // o usuário provavelmente já passou de nível
        if (currentPoints >= nextLevelPoints) {
            console.log("Pontos atuais excedem próximo nível");
            return 100;
        }

        // Pontos necessários para avançar
        var pointsNeeded = nextLevelPoints - currentLevelPoints;

        // Pontos que o jogador já ganhou neste nível
        var pointsGained = currentPoints - currentLevelPoints;

        // Se os pontos ganhos são negativos, algo está errado
        if (pointsGained < 0) {
            console.log("Pontos ganhos negativos:", pointsGained);
            return 0;
        }

        // Calcular porcentagem
        var percent = Math.floor((pointsGained / pointsNeeded) * 100);

        // Garantir que esteja entre 0 e 100
        percent = Math.max(0, Math.min(100, percent));

        console.log("Progresso calculado:", percent + "%");
        return percent;
    };

    // Check if user is logged in
    var userId = localStorage.getItem('userId');
    if (!userId) {
        $location.path('/'); // Redirect to login if not logged in
        return;
    }

    // Load user status
    $scope.loadUserStatus = function() {
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
                console.log('User status loaded:', response.data);
                $scope.userStatus = response.data;

                // Handle missing data with defaults
                if (!$scope.userStatus.extra) {
                    $scope.userStatus.extra = { maturity: 0, ilha: 'Ilha MOAI' };
                }

                // Garantir que level_progress exista e tenha valores padrão
                if (!$scope.userStatus.level_progress) {
                    $scope.userStatus.level_progress = {
                        percent: 0,
                        next_points: 25,
                        next_level: { level: 'Nível 2', minPoints: 25 }
                    };
                }

                // Garantir que next_level tenha minPoints definido
                if ($scope.userStatus.level_progress.next_level &&
                    !$scope.userStatus.level_progress.next_level.minPoints) {
                    $scope.userStatus.level_progress.next_level.minPoints = 25;
                }

                // Garantir que pointCategories tenha xp
                if (!$scope.userStatus.pointCategories) {
                    $scope.userStatus.pointCategories = { xp: 0, moaimoney: 0, moaicoins: 0 };
                }
                if ($scope.userStatus.pointCategories.xp === undefined) {
                    $scope.userStatus.pointCategories.xp = 0;
                }

                // Garantir que level tenha minPoints definido
                if ($scope.userStatus.level && !$scope.userStatus.level.minPoints) {
                    $scope.userStatus.level.minPoints = 0;
                }
            },
            function(error) {
                console.error('Failed to load user status:', error);
                alert('Falha ao carregar dados do usuário. Por favor, tente novamente.');
            }
        );
    };

    // Adicionar variáveis ao escopo
    $scope.userUpgrades = [];
    $scope.showUpgradeModal = false;
    $scope.selectedUpgrade = null;
    $scope.upgradeItems = [];
    $scope.isLoadingUpgrades = false;

    // Nova função para carregar upgrades do usuário
    $scope.loadUserUpgrades = function() {
        $scope.isLoadingUpgrades = true;
        var userId = AuthService.getUserId();

        var req = {
            method: 'GET',
            url: API_CONFIG.baseUrl + '/achievement',
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        $http(req).then(
            function(response) {
                console.log('Conquistas do usuário carregadas:', response.data);

                // Filtrar apenas os itens virtuais (type=1) do usuário atual
                var allAchievements = response.data;
                var upgrades = allAchievements.filter(function(achievement) {
                    return achievement.player === userId && achievement.type === 1;
                });

                $scope.userUpgrades = upgrades;
                $scope.isLoadingUpgrades = false;

                // Carregar detalhes dos itens para exibir corretamente
                $scope.loadUpgradeItemDetails();
            },
            function(error) {
                console.error('Falha ao carregar upgrades do usuário:', error);
                $scope.isLoadingUpgrades = false;
            }
        );
    };

    // Função para carregar detalhes dos itens de upgrade
    $scope.loadUpgradeItemDetails = function() {
        var req = {
            method: 'GET',
            url: API_CONFIG.baseUrl + '/virtualgoods/item',
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        $http(req).then(
            function(response) {
                console.log('Itens de upgrade carregados:', response.data);

                // Filtrar apenas itens do tipo upgrade
                $scope.upgradeItems = response.data.filter(function(item) {
                    return item.type === "upgrade";
                });

                // Associar detalhes dos itens aos upgrades do usuário
                $scope.userUpgrades.forEach(function(upgrade) {
                    var itemDetails = $scope.upgradeItems.find(function(item) {
                        return item._id === upgrade.item;
                    });

                    if (itemDetails) {
                        upgrade.details = itemDetails;
                    }
                });

                console.log('Upgrades do usuário com detalhes:', $scope.userUpgrades);
            },
            function(error) {
                console.error('Falha ao carregar detalhes dos upgrades:', error);
            }
        );
    };

    // Função para mostrar detalhes de um upgrade
    $scope.showUpgradeDetails = function(upgrade) {
        $scope.selectedUpgrade = upgrade;
        $scope.showUpgradeModal = true;
    };

    // Função para fechar o modal de upgrade
    $scope.closeUpgradeModal = function() {
        $scope.showUpgradeModal = false;
        $scope.selectedUpgrade = null;
    };

    // Verificar se é a primeira vez após o upgrade
    var firstUpgradeCompleted = localStorage.getItem('firstUpgradeCompleted');
    if (firstUpgradeCompleted === 'true') {
        // Limpar o sinalizador para evitar problemas futuros
        localStorage.removeItem('firstUpgradeCompleted');

        // Mostrar uma notificação de ilha atualizada
        $timeout(function() {
            var toast = `
                <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 5000">
                    <div id="islandUpdateToast" class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                        <div class="toast-header bg-moai-blue text-white">
                            <div class="me-2">🏝️</div>
                            <strong class="me-auto">Ilha Atualizada!</strong>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"
                                    onclick="document.getElementById('islandUpdateToast').remove()"></button>
                        </div>
                        <div class="toast-body">
                            Sua ilha foi atualizada com sua primeira construção MOAI!
                        </div>
                    </div>
                </div>
            `;

            // Adicionar o toast ao DOM
            var toastElement = angular.element(toast);
            angular.element(document.body).append(toastElement);

            // Remover após alguns segundos
            $timeout(function() {
                var existingToast = document.getElementById('islandUpdateToast');
                if (existingToast) {
                    existingToast.remove();
                }
            }, 5000);
        }, 1000);
    }

    // Load user status on controller initialization
    $scope.loadUserStatus();
});
