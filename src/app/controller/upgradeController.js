angular.module('moaiApp').controller('UpgradeController', function($scope, $http, $location, $timeout, API_CONFIG, AuthService) {
    // Verificar autenticação
    if (!AuthService.checkAuthentication()) {
        console.log("Autenticação falhou - redirecionando para login");
        return; // O serviço já redireciona para login
    }

    // Obter dados do jogador e nome da ilha
    $scope.islandName = 'MOAI'; // Nome padrão
    $scope.upgradeItems = [];
    $scope.userUpgrades = [];
    $scope.isLoading = true;

    // Estados para a animação do barco e popups
    $scope.boatArrived = false;
    $scope.showToolPopup = false;
    $scope.showUpgradeNotification = false;
    $scope.firstUpgradeCompleted = false;

    // Inicializar
    init();

    // Função de inicialização
    function init() {
        loadUserData();
        loadUpgradeItems();
    }

    // Carregar dados do usuário
    function loadUserData() {
        var userId = AuthService.getUserId();

        var req = {
            method: 'GET',
            url: API_CONFIG.baseUrl + '/player/' + userId,
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        $http(req).then(
            function(response) {
                console.log('Dados do jogador carregados:', response.data);

                if (response.data.extra && response.data.extra.ilha) {
                    $scope.islandName = response.data.extra.ilha;
                    console.log('Nome da ilha carregado com sucesso:', $scope.islandName);
                } else {
                    console.log('Nome da ilha não encontrado nos dados do jogador. Usando padrão:', $scope.islandName);
                }

                // Verificar se o jogador já concluiu o primeiro upgrade
                if (response.data.extra && response.data.extra.firstUpgradeCompleted) {
                    $scope.firstUpgradeCompleted = true;
                    // Se já concluiu, redirecionar para o dashboard
                    $location.path('/dashboard');
                } else {
                    // Iniciar sequência de animação após carregar dados
                    $timeout(function() {
                        startBoatAnimation();
                    }, 1000);
                }
            },
            function(error) {
                console.error('Falha ao carregar dados do jogador:', error);
                alert('Falha ao carregar seus dados. Por favor, tente novamente.');
            }
        );
    }

    // Carregar itens de upgrade disponíveis
    function loadUpgradeItems() {
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
                $scope.isLoading = false;

                // Filtrar apenas itens de upgrade (type = upgrade)
                $scope.upgradeItems = response.data.filter(function(item) {
                    return item.type === "upgrade";
                });

                console.log('Itens de upgrade filtrados:', $scope.upgradeItems);
            },
            function(error) {
                console.error('Falha ao carregar itens de upgrade:', error);
                $scope.isLoading = false;
            }
        );
    }

    // Iniciar a sequência de animação do barco
    function startBoatAnimation() {
        $scope.boatArrived = true;

        // Mostrar ferramenta após o barco chegar
        $timeout(function() {
            $scope.showToolPopup = true;
        }, 3500); // O barco leva 3s para chegar, adicionamos 0.5s extra
    }

    // Coletar a primeira pedra do MOAI
    $scope.collectFirstTool = function() {
        if ($scope.showToolPopup) {
            $scope.showToolPopup = false;

            // Encontrar o primeiro item de upgrade (pedra inicial)
            var firstTool = $scope.upgradeItems.find(function(item) {
                return item.name.includes('Ferramenta') || item.name.includes('Tool') || item.name.includes('Pedra');
            }) || ($scope.upgradeItems.length > 0 ? $scope.upgradeItems[0] : null);

            if (firstTool) {
                // Registrar a aquisição do item
                addUpgradeToUser(firstTool);
            } else {
                // Se não encontrarmos nenhum item, exibir notificação mesmo assim
                $timeout(function() {
                    $scope.showUpgradeNotification = true;
                }, 500);
            }

            // Forçar scroll para cima para garantir que o modal seja visível
            $timeout(function() {
                window.scrollTo(0, 0);
            }, 100);
        }
    };

    // Adicionar o upgrade ao usuário
    function addUpgradeToUser(item) {
        var userId = AuthService.getUserId();

        var req = {
            method: 'POST',
            url: API_CONFIG.baseUrl + '/achievement/create',
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            },
            data: {
                "player": userId,
                "type": 1, // Type 1 for virtual goods
                "item": item._id,
                "total": 1
            }
        };

        $http(req).then(
            function(response) {
                console.log('Item adicionado com sucesso:', response.data);

                // Marcar flag de primeiro upgrade no perfil do usuário
                updateUserFirstUpgradeFlag();

                // Mostrar notificação
                $scope.showUpgradeNotification = true;
            },
            function(error) {
                console.error('Falha ao adicionar item:', error);
                alert('Não foi possível iniciar a evolução do MOAI. Por favor, tente novamente.');

                // Mostrar o popup da ferramenta novamente
                $timeout(function() {
                    $scope.showToolPopup = true;
                }, 1000);
            }
        );
    }

    // Atualizar flag de primeiro upgrade no perfil do usuário
    function updateUserFirstUpgradeFlag() {
        var userId = AuthService.getUserId();

        // Primeiro obter o perfil completo
        var getProfileReq = {
            method: 'GET',
            url: API_CONFIG.baseUrl + '/player/' + userId,
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        $http(getProfileReq).then(
            function(response) {
                // Criar cópia do perfil e atualizar
                var updatedProfile = angular.copy(response.data);

                if (!updatedProfile.extra) {
                    updatedProfile.extra = {};
                }

                // Marcar que o primeiro upgrade foi concluído
                updatedProfile.extra.firstUpgradeCompleted = true;

                // Salvar perfil atualizado
                var updateReq = {
                    method: 'PUT',
                    url: API_CONFIG.baseUrl + '/player/' + userId,
                    headers: {
                        "Authorization": API_CONFIG.authHeader,
                        "Content-Type": "application/json"
                    },
                    data: updatedProfile
                };

                return $http(updateReq);
            }
        ).then(
            function(updateResponse) {
                console.log('Perfil atualizado, primeiro upgrade marcado como concluído:', updateResponse.data);
            }
        ).catch(
            function(error) {
                console.error('Falha ao atualizar o perfil do usuário:', error);
            }
        );
    }

    // Navegar para o dashboard
    $scope.goToDashboard = function() {
        // Adicionar uma variável de loading se ela não existir
        $scope.isRedirecting = true;

        // Armazenar informação de que o upgrade foi concluído em localStorage para uso pelo dashboardController
        localStorage.setItem('firstUpgradeCompleted', 'true');

        // Aguardar um curto período para os efeitos visuais de transição
        $timeout(function() {
            $location.path('/dashboard');
        }, 800);
    };
});
