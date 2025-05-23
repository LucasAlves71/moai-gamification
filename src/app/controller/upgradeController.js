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
    $scope.userResources = {}; // Para armazenar os recursos do usuário
    $scope.selectedUpgrade = null; // Para o modal de detalhes/confirmação
    $scope.showUpgradeDetailsModal = false; // Controle de visibilidade do modal
    $scope.isProcessingPurchase = false; // Flag para controle de processo de compra

    // Estados para a animação do barco e popups
    $scope.boatArrived = false;
    $scope.showToolPopup = false;
    $scope.showUpgradeNotification = false;
    $scope.firstUpgradeCompleted = false;

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

    // Inicializar
    init();

    // Função de inicialização
    function init() {
        loadUserData();
        loadUpgradeItems();
        loadUserResources();
        loadUserStatus(); // Para obter o nível atual
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
            url: 'https://service2.funifier.com/v3/virtualgoods/item',
            headers: {
                "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
                "Content-Type": "application/json"
            }
        };

        $http(req).then(
            function(response) {
                console.log('Itens de upgrade carregados:', response.data);
                $scope.isLoading = false;

                // Filtrar apenas itens de upgrade (catalogId = upgrades)
                $scope.upgradeItems = response.data.filter(function(item) {
                    return item.catalogId === "upgrades";
                });

                // Ordenar os upgrades por complexidade (baseado nos requisitos)
                $scope.upgradeItems.sort(function(a, b) {
                    // Verificar energia como critério principal
                    var aEnergy = getResourceRequirement(a, 'energia') || 0;
                    var bEnergy = getResourceRequirement(b, 'energia') || 0;
                    return aEnergy - bEnergy;
                });

                console.log('Itens de upgrade filtrados:', $scope.upgradeItems);
            },
            function(error) {
                console.error('Falha ao carregar itens de upgrade:', error);
                $scope.isLoading = false;
            }
        );
    }

    // Carregar recursos do usuário
    function loadUserResources() {
        var userId = AuthService.getUserId();

        var req = {
            method: 'GET',
            url: 'https://service2.funifier.com/v3/player/' + userId + '/status',
            headers: {
                "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
                "Content-Type": "application/json"
            }
        };

        $http(req).then(
            function(response) {
                console.log('Recursos do usuário carregados:', response.data);

                // Verificar se os recursos existem na resposta
                if (response.data.pointCategories) {
                    $scope.userResources = response.data.pointCategories;

                    // Garantir que todos os recursos existam
                    if (!$scope.userResources.energia) $scope.userResources.energia = 0;
                    if (!$scope.userResources.ferramenta) $scope.userResources.ferramenta = 0;
                    if (!$scope.userResources.criatividade) $scope.userResources.criatividade = 0;
                    if (!$scope.userResources.moaicoins) $scope.userResources.moaicoins = 0;
                    if (!$scope.userResources.moaimoney) $scope.userResources.moaimoney = 0;
                    if (!$scope.userResources.xp) $scope.userResources.xp = 0;
                }
            },
            function(error) {
                console.error('Falha ao carregar recursos do usuário:', error);
            }
        );
    }

    // Carregar status do usuário para obter nível
    function loadUserStatus() {
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
                $scope.userStatus = response.data;
            },
            function(error) {
                console.error('Falha ao carregar status do usuário:', error);
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
                return item.name.includes('Bloco de pedra') || item.name.includes('Ferramenta') || item.name.includes('Tool') || item.name.includes('Pedra');
            }) || ($scope.upgradeItems.length > 0 ? $scope.upgradeItems[0] : null);

            if (firstTool) {
                // Usar a API de purchase para registrar o resgate
                var userId = AuthService.getUserId();
                $scope.isProcessingPurchase = true;

                var req = {
                    method: 'POST',
                    url: 'https://service2.funifier.com/v3/virtualgoods/purchase',
                    headers: {
                        "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
                        "Content-Type": "application/json"
                    },
                    data: {
                        "player": userId,
                        "item": firstTool._id,
                        "total": 1
                    }
                };

                $http(req).then(
                    function(response) {
                        console.log('Primeira pedra MOAI resgatada com sucesso:', response.data);
                        $scope.isProcessingPurchase = false;

                        // Marcar flag de primeiro upgrade no perfil do usuário
                        updateUserFirstUpgradeFlag();

                        // Mostrar notificação
                        $scope.showUpgradeNotification = true;
                    },
                    function(error) {
                        console.error('Falha ao resgatar primeira pedra MOAI:', error);
                        $scope.isProcessingPurchase = false;

                        // Mostrar o popup da ferramenta novamente
                        $timeout(function() {
                            $scope.showToolPopup = true;
                        }, 1000);

                        var errorMessage = 'Não foi possível iniciar a evolução do MOAI.';
                        if (error.data && error.data.message) {
                            errorMessage += ' ' + error.data.message;
                        }

                        alert(errorMessage);
                    }
                );
            } else {
                // Se não encontrarmos nenhum item, exibir notificação mesmo assim
                $timeout(function() {
                    $scope.showUpgradeNotification = true;
                }, 500);

                console.error('Nenhum item de pedra MOAI encontrado na lista de upgrades');
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

    // Helper para obter requisito de recurso
    function getResourceRequirement(item, resourceType) {
        if (!item || !item.requires) return 0;

        var req = item.requires.find(function(r) {
            return r.type === 0 && r.item === resourceType;
        });

        return req ? req.total : 0;
    }

    // Verificar se um item de upgrade pode ser comprado
    $scope.canPurchaseUpgrade = function(item) {
        if (!item || !item.requires) return true;

        // Verificar cada requisito
        for (var i = 0; i < item.requires.length; i++) {
            var req = item.requires[i];

            if (req.type === 0) { // Requisito de pontos/recursos
                var resourceType = req.item;
                var required = req.total;
                var current = $scope.userResources[resourceType] || 0;

                if (current < required) {
                    return false;
                }
            } else if (req.type === 3) { // Requisito de nível
                var levelId = req.item;
                var userLevelId = $scope.userStatus && $scope.userStatus.level ? $scope.userStatus.level._id : "";

                // Se não temos o ID do nível do usuário, não podemos verificar
                if (!userLevelId) return false;

                // Obter números dos níveis para comparação
                var requiredLevel = getLevelNumber(levelId);
                var userLevel = getLevelNumber(userLevelId);

                if (userLevel < requiredLevel) {
                    return false;
                }
            }
        }

        return true;
    };

    // Função auxiliar para obter número do nível a partir do ID
    function getLevelNumber(levelId) {
        var levelMap = {
            "682755212327f74f3a3d74e1": 1, // Nível 1
            "682755472327f74f3a3d74eb": 2, // Nível 2
            "682755582327f74f3a3d74ef": 3, // Nível 3
            "6827556b2327f74f3a3d74f7": 4, // Nível 4
            "682755752327f74f3a3d74f8": 5, // Nível 5
            "682755802327f74f3a3d74fa": 6, // Nível 6
            "6827558b2327f74f3a3d74fc": 7  // Nível 7
        };

        return levelMap[levelId] || 0;
    }

    // Mostrar detalhes do upgrade e confirmar compra
    $scope.showUpgradeDetails = function(upgrade) {
        $scope.selectedUpgrade = upgrade;
        $scope.showUpgradeDetailsModal = true;
    };

    // Fechar o modal de detalhes
    $scope.closeUpgradeDetailsModal = function() {
        $scope.showUpgradeDetailsModal = false;
        $scope.selectedUpgrade = null;
    };

    // Função para formatar requisitos de forma legível
    $scope.formatRequirement = function(req) {
        if (req.type === 0) { // Recurso
            var resourceName = req.item;
            switch(resourceName) {
                case 'energia': return req.total + ' Energia';
                case 'ferramenta': return req.total + ' Ferramenta';
                case 'criatividade': return req.total + ' Criatividade';
                case 'moaicoins': return req.total + ' MOAIcoins';
                case 'moaimoney': return req.total + ' MOAImoney';
                default: return req.total + ' ' + resourceName;
            }
        } else if (req.type === 3) { // Nível
            return $scope.levelMap[req.item] || ('Nível ' + getLevelNumber(req.item));
        }

        return 'Requisito desconhecido';
    };

    // Função para formatar recompensas de forma legível
    $scope.formatReward = function(reward) {
        if (reward.type === 0) { // Pontos
            var resourceName = reward.item;
            switch(resourceName) {
                case 'xp': return reward.total + ' XP';
                case 'moaicoins': return reward.total + ' MOAIcoins';
                case 'moaimoney': return reward.total + ' MOAImoney';
                default: return reward.total + ' ' + resourceName;
            }
        }

        return 'Recompensa desconhecida';
    };

    // Comprar/resgatar um upgrade
    $scope.purchaseUpgrade = function(upgrade) {
        if (!upgrade || $scope.isProcessingPurchase) return;

        // Verificar novamente se o upgrade pode ser comprado
        if (!$scope.canPurchaseUpgrade(upgrade)) {
            alert('Você não atende aos requisitos para esta evolução.');
            return;
        }

        $scope.isProcessingPurchase = true;
        var userId = AuthService.getUserId();

        var req = {
            method: 'POST',
            url: 'https://service2.funifier.com/v3/virtualgoods/purchase',
            headers: {
                "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
                "Content-Type": "application/json"
            },
            data: {
                "player": userId,
                "item": upgrade._id,
                "total": 1
            }
        };

        $http(req).then(
            function(response) {
                console.log('Upgrade comprado com sucesso:', response.data);
                $scope.isProcessingPurchase = false;

                // Fechar o modal
                $scope.closeUpgradeDetailsModal();

                // Atualizar recursos do usuário
                loadUserResources();

                // Mostrar mensagem de sucesso
                alert('Sua evolução MOAI foi concluída com sucesso!');

                // Atualizar lista de upgrades
                loadUpgradeItems();
            },
            function(error) {
                console.error('Falha ao comprar upgrade:', error);
                $scope.isProcessingPurchase = false;

                var errorMessage = 'Não foi possível completar a evolução.';
                if (error.data && error.data.message) {
                    errorMessage += ' ' + error.data.message;
                }

                alert(errorMessage);
            }
        );
    };
});
