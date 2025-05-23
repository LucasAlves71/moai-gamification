angular.module('moaiApp').controller('DashboardController', function($scope, $http, $location, $timeout, $q, API_CONFIG, AuthService) {
    // Check if the user is authenticated
    if (!AuthService.checkAuthentication()) {
        console.log("Authentication failed - redirecting to login");
        return; // The service already redirects to login
    }

    // Initialize user status
    $scope.userStatus = {
        pointCategories: {
            moaicoins: 0,
            moaimoney: 0,
            xp: 0
        },
        extra: {
            maturity: 1
        },
        level: {
            level: "Nível 1"
        },
        level_progress: {
            next_level: {
                minPoints: 25
            }
        }
    };

    // Initialize resources
    $scope.userResources = {
        energia: 0,
        ferramenta: 0,
        criatividade: 0
    };

    // Upgrade shop state
    $scope.isUpgradeShopVisible = false;
    $scope.upgradeItems = [];
    $scope.isLoadingUpgrades = false;
    $scope.isProcessingPurchase = false;
    $scope.selectedUpgradeId = null;

    // Level ID to name mapping
    $scope.levelMap = {
        "682755212327f74f3a3d74e1": "Nível 1",
        "682755472327f74f3a3d74eb": "Nível 2",
        "682755582327f74f3a3d74ef": "Nível 3",
        "6827556b2327f74f3a3d74f7": "Nível 4",
        "682755752327f74f3a3d74f8": "Nível 5",
        "682755802327f74f3a3d74fa": "Nível 6",
        "6827558b2327f74f3a3d74fc": "Nível 7"
    };

    // Map level IDs to numbers for comparison
    $scope.levelNumberMap = {
        "682755212327f74f3a3d74e1": 1,
        "682755472327f74f3a3d74eb": 2,
        "682755582327f74f3a3d74ef": 3,
        "6827556b2327f74f3a3d74f7": 4,
        "682755752327f74f3a3d74f8": 5,
        "682755802327f74f3a3d74fa": 6,
        "6827558b2327f74f3a3d74fc": 7
    };

    // Function to convert maturity level number to text
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

    // Function to calculate level progress percentage
    $scope.calculateLevelProgress = function() {
        if (!$scope.userStatus) return 0;

        console.log("Calculating progress:", {
            pointCategories: $scope.userStatus.pointCategories,
            xp: $scope.userStatus.pointCategories ? $scope.userStatus.pointCategories.xp : undefined,
            level: $scope.userStatus.level,
            level_progress: $scope.userStatus.level_progress
        });

        // Check if we have the necessary data
        if (!$scope.userStatus.pointCategories ||
            !$scope.userStatus.level_progress ||
            !$scope.userStatus.level_progress.next_level ||
            !$scope.userStatus.level_progress.next_level.minPoints) {
            return 0;
        }

        var currentXP = $scope.userStatus.pointCategories.xp || 0;
        var currentLevelMinPoints = $scope.userStatus.level && $scope.userStatus.level.minPoints ? $scope.userStatus.level.minPoints : 0;
        var nextLevelMinPoints = $scope.userStatus.level_progress.next_level.minPoints;

        var pointsForThisLevel = nextLevelMinPoints - currentLevelMinPoints;
        var pointsEarned = currentXP - currentLevelMinPoints;

        if (pointsForThisLevel <= 0) return 0; // Avoid division by zero

        var progress = Math.min(100, Math.max(0, (pointsEarned / pointsForThisLevel) * 100));
        return Math.round(progress);
    };

    // Load user status from API
    $scope.loadUserStatus = function() {
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
                console.log('User status loaded:', response.data);
                $scope.userStatus = response.data;

                // Handle missing data with defaults
                if (!$scope.userStatus.pointCategories) {
                    $scope.userStatus.pointCategories = { xp: 0, moaimoney: 0, moaicoins: 0 };
                }
                if ($scope.userStatus.pointCategories.xp === undefined) {
                    $scope.userStatus.pointCategories.xp = 0;
                }

                // Ensure level has minPoints defined
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

    // Load user resources
    $scope.loadUserResources = function() {
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
                console.log('User resources loaded:', response.data);

                // Verificar se os recursos existem na resposta
                if (response.data.pointCategories || response.data.point_categories) {
                    // API pode retornar pointCategories ou point_categories
                    var categories = response.data.pointCategories || response.data.point_categories;

                    // Atualizar recursos do usuário
                    $scope.userResources = {
                        energia: categories.energia || 0,
                        ferramenta: categories.ferramenta || 0,
                        criatividade: categories.criatividade || 0
                    };

                    // Garantir que os recursos não sejam negativos
                    $scope.userResources.energia = Math.max(0, $scope.userResources.energia);
                    $scope.userResources.ferramenta = Math.max(0, $scope.userResources.ferramenta);
                    $scope.userResources.criatividade = Math.max(0, $scope.userResources.criatividade);

                    console.log('Processed user resources:', $scope.userResources);
                }
            },
            function(error) {
                console.error('Failed to load user resources:', error);
            }
        );
    };

    // Show upgrade shop modal
    $scope.showUpgradeShop = function() {
        console.log('Opening MOAI upgrade shop');
        $scope.isUpgradeShopVisible = true;
        $scope.loadUpgradeItems();

        // Prevent scrolling on the background
        document.body.style.overflow = 'hidden';
    };

    // Close upgrade shop modal
    $scope.closeUpgradeShop = function() {
        console.log('Closing MOAI upgrade shop');
        $scope.isUpgradeShopVisible = false;

        // Re-enable scrolling
        document.body.style.overflow = '';
    };

    // Initialize timestamp
    $scope.updateTimestamp = new Date().getTime();

    // Load upgrade items
    $scope.loadUpgradeItems = function() {
        $scope.isLoadingUpgrades = true;

        // Primeiro, obter a lista de todos os upgrades disponíveis
        var itemsReq = {
            method: 'GET',
            url: 'https://service2.funifier.com/v3/virtualgoods/item',
            headers: {
                "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
                "Content-Type": "application/json"
            }
        };

        // Depois, obter os achievements do jogador para identificar quais upgrades já foram adquiridos
        var userId = AuthService.getUserId();
        var achievementsReq = {
            method: 'GET',
            url: 'https://service2.funifier.com/v3/achievement',
            headers: {
                "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
                "Content-Type": "application/json"
            }
        };

        // Executar as duas requisições e processar os resultados
        $q.all([$http(itemsReq), $http(achievementsReq)])
            .then(function(responses) {
                console.log('Upgrade items loaded:', responses[0].data);
                console.log('Achievements loaded:', responses[1].data);
                $scope.isLoadingUpgrades = false;

                // Obter todos os itens de upgrade
                var allItems = responses[0].data;
                var achievements = responses[1].data;

                // Filtrar apenas itens de upgrade (catalog = upgrades)
                $scope.upgradeItems = allItems.filter(function(item) {
                    return item.catalogId === "upgrades";
                });

                // Identificar quais upgrades o jogador já possui
                var userAchievements = achievements.filter(function(achievement) {
                    return achievement.player === userId &&
                           (achievement.type === 2 || // Tipo 2 para aquisições de itens
                           (achievement.type === 1 && achievement.category === "upgrade")); // OU tipo 1 com categoria "upgrade"
                });

                // Mapear IDs de upgrades que o jogador já possui
                var ownedUpgradeIds = userAchievements.map(function(achievement) {
                    return achievement.item;
                });

                console.log('Owned upgrade IDs:', ownedUpgradeIds);

                // Marcar upgrades que o jogador já possui
                $scope.upgradeItems.forEach(function(item) {
                    item.owned = ownedUpgradeIds.includes(item._id) ? 1 : 0;
                });

                // Sort upgrades by complexity/requirements
                $scope.upgradeItems.sort(function(a, b) {
                    // Check energy as primary criteria
                    var aEnergy = getResourceRequirement(a, 'energia') || 0;
                    var bEnergy = getResourceRequirement(b, 'energia') || 0;
                    return aEnergy - bEnergy;
                });

                console.log('Filtered and processed upgrade items:', $scope.upgradeItems);

                // Atualizar timestamp para forçar recarregamento da imagem
                $scope.updateTimestamp = new Date().getTime();
            })
            .catch(function(error) {
                console.error('Failed to load upgrade items or achievements:', error);
                $scope.isLoadingUpgrades = false;
                alert('Falha ao carregar itens de evolução MOAI. Por favor, tente novamente.');
            });
    };

    // Função para carregar os upgrades do jogador no carregamento inicial da página
    $scope.loadInitialUpgradeStatus = function() {
        console.log("Carregando status inicial dos upgrades...");

        // Primeiro, obter a lista de todos os upgrades disponíveis
        var itemsReq = {
            method: 'GET',
            url: 'https://service2.funifier.com/v3/virtualgoods/item',
            headers: {
                "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
                "Content-Type": "application/json"
            }
        };

        // Depois, obter os achievements do jogador para identificar quais upgrades já foram adquiridos
        var userId = AuthService.getUserId();
        var achievementsReq = {
            method: 'GET',
            url: 'https://service2.funifier.com/v3/achievement',
            headers: {
                "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
                "Content-Type": "application/json"
            }
        };

        // Executar as duas requisições e processar os resultados
        $q.all([$http(itemsReq), $http(achievementsReq)])
            .then(function(responses) {
                console.log('Upgrade items loaded (initial):', responses[0].data);
                console.log('Achievements loaded (initial):', responses[1].data);

                // Obter todos os itens de upgrade
                var allItems = responses[0].data;
                var achievements = responses[1].data;

                // Filtrar apenas itens de upgrade (catalog = upgrades)
                $scope.upgradeItems = allItems.filter(function(item) {
                    return item.catalogId === "upgrades";
                });

                // Identificar quais upgrades o jogador já possui
                var userAchievements = achievements.filter(function(achievement) {
                    return achievement.player === userId &&
                           (achievement.type === 2 || // Tipo 2 para aquisições de itens
                           (achievement.type === 1 && achievement.category === "upgrade")); // OU tipo 1 com categoria "upgrade"
                });

                // Mapear IDs de upgrades que o jogador já possui
                var ownedUpgradeIds = userAchievements.map(function(achievement) {
                    return achievement.item;
                });

                console.log('Owned upgrade IDs (initial):', ownedUpgradeIds);

                // Marcar upgrades que o jogador já possui
                $scope.upgradeItems.forEach(function(item) {
                    item.owned = ownedUpgradeIds.includes(item._id) ? 1 : 0;
                });

                // Sort upgrades by complexity/requirements
                $scope.upgradeItems.sort(function(a, b) {
                    // Check energy as primary criteria
                    var aEnergy = getResourceRequirement(a, 'energia') || 0;
                    var bEnergy = getResourceRequirement(b, 'energia') || 0;
                    return aEnergy - bEnergy;
                });

                console.log('Filtered and processed upgrade items (initial):', $scope.upgradeItems);

                // Atualizar timestamp para forçar recarregamento da imagem
                $scope.updateTimestamp = new Date().getTime();

                // Forçar atualização da visualização após carregar os upgrades
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            })
            .catch(function(error) {
                console.error('Failed to load initial upgrade items or achievements:', error);
            });
    };

    // Helper function to get resource requirement amount
    function getResourceRequirement(item, resourceType) {
        if (!item.requires) return null;

        for (var i = 0; i < item.requires.length; i++) {
            var req = item.requires[i];
            if (req.type === 0 && req.item === resourceType) {
                return req.total;
            }
        }
        return null;
    }

    // Check if user has enough of a resource for a requirement
    $scope.hasEnoughResource = function(requirement) {
        if (requirement.type === 0) { // Point/resource requirement
            var resourceType = requirement.item;
            var requiredAmount = requirement.total;
            var currentAmount = 0;

            // Para recursos de pontos: moaicoins, moaimoney, xp
            if (resourceType === 'moaicoins' || resourceType === 'moaimoney' || resourceType === 'xp') {
                if ($scope.userStatus && $scope.userStatus.pointCategories) {
                    currentAmount = $scope.userStatus.pointCategories[resourceType] || 0;
                }
            }
            // Para recursos de produção: energia, ferramenta, criatividade
            else {
                if ($scope.userResources) {
                    currentAmount = $scope.userResources[resourceType] || 0;
                }
            }

            console.log('Verificando ' + resourceType + ': Requerido = ' + requiredAmount + ', Disponível = ' + currentAmount);
            return currentAmount >= requiredAmount;
        }
        else if (requirement.type === 3) { // Level requirement
            var levelId = requirement.item;
            var requiredLevel = $scope.levelNumberMap[levelId] || 999;

            // Get user's current level number
            var userLevelId = "";
            if ($scope.userStatus && $scope.userStatus.level && $scope.userStatus.level._id) {
                userLevelId = $scope.userStatus.level._id;
            }

            var userLevel = $scope.levelNumberMap[userLevelId] || 0;

            console.log('Verificando nível: Requerido = ' + requiredLevel + ', Atual = ' + userLevel);
            return userLevel >= requiredLevel;
        }

        return false;
    };

    // Check if an upgrade can be purchased
    $scope.canPurchaseUpgrade = function(item) {
        if (!item || !item.requires || item.owned > 0) {
            console.log('Item cannot be purchased: invalid item or already owned');
            return false;
        }

        console.log('Checking if item can be purchased:', item.name);

        // Check each requirement
        for (var i = 0; i < item.requires.length; i++) {
            var req = item.requires[i];
            var hasEnough = $scope.hasEnoughResource(req);
            console.log('Requirement:', req, 'Has enough:', hasEnough);

            if (!hasEnough) {
                console.log('Requirement not met for:', item.name);
                return false;
            }
        }

        console.log('All requirements met for:', item.name);
        return true;
    };

    // Format requirement text
    $scope.formatRequirement = function(req) {
        if (req.type === 0) { // Resource
            var resourceName = req.item;
            var currentValue = 0;

            // Get current amount based on resource type
            if (resourceName === 'moaicoins' || resourceName === 'moaimoney' || resourceName === 'xp') {
                currentValue = $scope.userStatus &&
                              $scope.userStatus.pointCategories &&
                              $scope.userStatus.pointCategories[resourceName] || 0;
            } else {
                currentValue = $scope.userResources && $scope.userResources[resourceName] || 0;
            }

            var formattedName = '';
            switch(resourceName) {
                case 'energia': formattedName = 'Energia'; break;
                case 'ferramenta': formattedName = 'Ferramenta'; break;
                case 'criatividade': formattedName = 'Criatividade'; break;
                case 'moaicoins': formattedName = 'MOAIcoins'; break;
                case 'moaimoney': formattedName = 'MOAImoney'; break;
                default: formattedName = resourceName;
            }

            return req.total + ' ' + formattedName + ' (' + currentValue + ' disponível)';
        } else if (req.type === 3) { // Level
            return $scope.levelMap[req.item] || ('Nível ' + $scope.levelNumberMap[req.item]);
        }

        return 'Requisito desconhecido';
    };

    // Format reward text
    $scope.formatReward = function(reward) {
        if (reward.type === 0) { // Point/resource
            var resourceName = reward.item;
            switch(resourceName) {
                case 'energia': return reward.total + ' Energia';
                case 'ferramenta': return reward.total + ' Ferramenta';
                case 'criatividade': return reward.total + ' Criatividade';
                case 'moaicoins': return reward.total + ' MOAIcoins';
                case 'moaimoney': return reward.total + ' MOAImoney';
                case 'xp': return reward.total + ' XP';
                default: return reward.total + ' ' + resourceName;
            }
        }

        return 'Recompensa desconhecida';
    };

    // Mapeamento de nomes de upgrades para a imagem correspondente
    $scope.upgradeImageMap = {
        "Bloco de pedra entregue na margem da ilha": "public/img/ilha-com-barco-margem.png",
        "Transporte do bloco para o centro da ilha": "public/img/ilha-com-pedra-centro.png",
        "Levantamento do bloco na posição vertical": "public/img/ilha-com-bloco-vertical.png",
        "Fixação da base no solo da ilha": "public/img/ilha-com-base-fixada.png",
        "Esculpir os olhos": "public/img/ilha-com-base-olhos.png",
        "Esculpir o nariz": "public/img/ilha-com-moai-nariz.png",
        "Esculpir a boca": "public/img/ilha-com-moai-boca.png",
        "Revelar as orelhas": "public/img/ilha-com-moai-orelhas.png",
        "Adicionar pedestal com o nome da ilha": "public/img/ilha-com-moai-pedestal.png",
        "Aplicar o acabamento dourado final": "public/img/ilha-com-moai-dourado.png"
    };

    // Ordem dos upgrades para determinar o mais recente
    $scope.upgradeOrder = [
        "Bloco de pedra entregue na margem da ilha",
        "Transporte do bloco para o centro da ilha",
        "Levantamento do bloco na posição vertical",
        "Fixação da base no solo da ilha",
        "Esculpir os olhos",
        "Esculpir o nariz",
        "Esculpir a boca",
        "Revelar as orelhas",
        "Adicionar pedestal com o nome da ilha",
        "Aplicar o acabamento dourado final"
    ];

    // Obter a imagem atual do MOAI com base nos upgrades adquiridos
    $scope.getCurrentMoaiImage = function() {
        // Prevent infinite recursion
        if ($scope.isProcessingImage) {
            return "public/img/ilha-sem-nada.png";
        }

        // Se não temos upgrades carregados ainda, retorna imagem base
        if (!$scope.upgradeItems || $scope.upgradeItems.length === 0) {
            console.log("Nenhum upgrade carregado, usando imagem padrão");
            return "public/img/ilha-sem-nada.png";
        }

        // Encontrar o upgrade mais recente que o jogador possui
        var ownedUpgrades = $scope.upgradeItems
            .filter(function(item) { return item.owned > 0; })
            .map(function(item) { return item.name; });

        console.log("Upgrades possuídos:", ownedUpgrades);

        // Sem upgrades, retorna a ilha vazia
        if (ownedUpgrades.length === 0) {
            return "public/img/ilha-sem-nada.png";
        }

        // Encontrar o upgrade mais avançado da lista ordenada
        var mostAdvancedUpgrade = "";
        for (var i = $scope.upgradeOrder.length - 1; i >= 0; i--) {
            if (ownedUpgrades.includes($scope.upgradeOrder[i])) {
                mostAdvancedUpgrade = $scope.upgradeOrder[i];
                console.log("Upgrade mais avançado encontrado:", mostAdvancedUpgrade);
                break;
            }
        }

        // Se encontrou um upgrade avançado, retorna sua imagem
        if (mostAdvancedUpgrade && $scope.upgradeImageMap[mostAdvancedUpgrade]) {
            var imagePath = $scope.upgradeImageMap[mostAdvancedUpgrade];
            console.log("Retornando imagem para upgrade:", mostAdvancedUpgrade, imagePath);

            // Verificar se a imagem existe antes de retorná-la
            var img = new Image();
            img.onload = function() {
                // A imagem existe
                console.log("Imagem carregada com sucesso:", imagePath);
            };

            img.onerror = function() {
                // A imagem não existe, usar fallback
                console.log("Erro ao carregar imagem:", imagePath, " - usando imagem padrão");
                // Não podemos mudar o retorno aqui devido ao escopo assíncrono
            };

            img.src = imagePath;
            return imagePath;
        }

        // Caso não encontre nenhum dos upgrades mapeados
        return "public/img/ilha-sem-nada.png";
    };

    // Obter o estágio atual do MOAI para exibição
    $scope.getCurrentMoaiStage = function() {
        var ownedUpgrades = $scope.upgradeItems
            .filter(function(item) { return item.owned > 0; })
            .map(function(item) { return item.name; });

        if (ownedUpgrades.length === 0) {
            return "Base inicial";
        }

        // Encontrar o upgrade mais avançado
        var mostAdvancedUpgrade = "";
        for (var i = $scope.upgradeOrder.length - 1; i >= 0; i--) {
            if (ownedUpgrades.includes($scope.upgradeOrder[i])) {
                return $scope.upgradeOrder[i]; // Retorna o nome do upgrade mais avançado
            }
        }

        return "Base inicial";
    };

    // Obter a imagem para preview de um upgrade específico
    $scope.getMoaiImageForUpgrade = function(upgrade) {
        if (!upgrade || !upgrade.name) {
            return "public/img/ilha-sem-nada.png";
        }

        // Verifica se o upgrade está no mapeamento
        if ($scope.upgradeImageMap[upgrade.name]) {
            return $scope.upgradeImageMap[upgrade.name];
        }

        // Se não encontrou, retorna a imagem atual
        return $scope.getCurrentMoaiImage();
    };

    // Atualizar o método purchaseUpgrade para mostrar uma animação após a compra bem-sucedida
    $scope.purchaseUpgrade = function(item) {
        if (!$scope.canPurchaseUpgrade(item)) {
            console.log('Cannot purchase upgrade, requirements not met');
            alert('Você não atende aos requisitos para esta evolução.');
            return;
        }

        if (item.owned > 0) {
            console.log('Upgrade already owned');
            alert('Você já adquiriu esta evolução.');
            return;
        }

        // Check if already processing - prevent duplicate calls
        if ($scope.isProcessingPurchase) {
            console.log('Already processing a purchase, ignoring request');
            return;
        }

        console.log('Attempting to purchase upgrade:', item);

        // Set processing state
        $scope.isProcessingPurchase = true;
        $scope.selectedUpgradeId = item._id;

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
                "item": item._id,
                "total": 1
            }
        };

        $http(req).then(
            function(response) {
                console.log('Upgrade purchased successfully:', response.data);

                // Update item owned status
                item.owned = 1;

                // Refresh user data
                $scope.loadUserStatus();
                $scope.loadUserResources();

                // Mostrar modal de sucesso com a nova imagem
                showUpgradeSuccessAnimation(item);

                // Forçar fechamento do modal para visualizar a ilha atualizada
                $scope.closeUpgradeShop();

                // Atualizar timestamp para forçar recarregamento da imagem
                $scope.updateTimestamp = new Date().getTime();

                // Resetar flags de processamento somente depois de tudo terminado
                $timeout(function() {
                    $scope.isProcessingPurchase = false;
                    $scope.selectedUpgradeId = null;

                    // Forçar o Angular a aplicar as mudanças
                    if(!$scope.$$phase) {
                        $scope.$apply();
                    }
                }, 500);
            },
            function(error) {
                console.error('Failed to purchase upgrade:', error);
                $scope.isProcessingPurchase = false;
                $scope.selectedUpgradeId = null;

                var errorMsg = 'Não foi possível adquirir esta evolução.';
                if (error && error.data && error.data.message) {
                    errorMsg += ' ' + error.data.message;
                }
                alert(errorMsg);
            }
        );
    };

    // Função para mostrar animação de sucesso após a compra
    function showUpgradeSuccessAnimation(item) {
        // Primeiro exibimos um alert simples
        var upgradeMessage = 'Evolução MOAI concluída com sucesso!\n\n';
        upgradeMessage += 'Seu MOAI evoluiu para: ' + item.name;

        alert(upgradeMessage);

        // Aplicar efeito de destaque na imagem da ilha
        // Este efeito poderia ser implementado com CSS se houver um elemento com ID específico
    }

    // Initial load
    $scope.loadUserStatus();
    $scope.loadUserResources();
    $scope.loadInitialUpgradeStatus(); // Add this line to load upgrades on initialization

});
