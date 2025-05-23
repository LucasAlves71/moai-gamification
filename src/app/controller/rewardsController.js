angular.module('moaiApp').controller('RewardsController', function($scope, $http, $location, API_CONFIG, AuthService) {
    console.log("RewardsController iniciado");

    // Inicialize explicitamente as variáveis relacionadas ao modal
    $scope.historyModalVisible = false;
    $scope.isLoadingHistory = false;
    $scope.purchases = [];
    $scope.purchaseDetails = {}; // Para armazenar detalhes como nomes de itens

    // Aplicar a classe rewards-page ao corpo para o espaçamento correto
    angular.element(document.body).addClass('rewards-page');

    // Remover a classe quando sair da página
    $scope.$on('$destroy', function() {
        angular.element(document.body).removeClass('rewards-page');
    });

    // Verificação de autenticação usando o serviço
    if (!AuthService.checkAuthentication()) {
        console.log("Autenticação falhou - redirecionando para login");
        return; // O serviço já redireciona para login
    }

    console.log("Autenticação bem sucedida - continuando carregamento");

    // Initialize rewards items array
    $scope.rewardItems = [];
    $scope.selectedItem = null;
    $scope.modalVisible = false;

    // Initialize user status
    $scope.userStatus = {
        total_points: 0,
        pointCategories: {
            moaimoney: 0
        }
    };

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

    // Function to get level name from ID
    $scope.getLevelName = function(levelId) {
        return $scope.levelMap[levelId] || "Desconhecido";
    };

    // NOVO: Função para verificar se um item tem requisito de nível
    $scope.hasLevelRequirement = function(item) {
        if (!item || !item.requires) return false;

        for (var i = 0; i < item.requires.length; i++) {
            if (item.requires[i].type === 3) {
                return true;
            }
        }
        return false;
    };

    // NOVO: Função para obter o nível dos requisitos
    $scope.getLevelFromRequirements = function(item) {
        if (!item || !item.requires) return "Desconhecido";

        for (var i = 0; i < item.requires.length; i++) {
            if (item.requires[i].type === 3) {
                return $scope.getLevelName(item.requires[i].item);
            }
        }
        return "Desconhecido";
    };

    // Function to determine item type based on name
    $scope.getItemType = function(name) {
        if (!name) return "default";

        const lowerName = name.toLowerCase();

        if (lowerName.includes("🎫") || lowerName.includes("ingresso")) return "ticket";
        if (lowerName.includes("🏆") || lowerName.includes("troféu") || lowerName.includes("awards")) return "trophy";
        if (lowerName.includes("👨‍💼") || lowerName.includes("mentoria")) return "mentorship";
        if (lowerName.includes("📘") || lowerName.includes("livro")) return "book";
        if (lowerName.includes("🎓") || lowerName.includes("vaga") || lowerName.includes("journey")) return "education";
        if (lowerName.includes("🏛️") || lowerName.includes("acesso") || lowerName.includes("conselho")) return "access";
        if (lowerName.includes("🧢") || lowerName.includes("boné") || lowerName.includes("camiseta")) return "clothing";
        if (lowerName.includes("🍽️") || lowerName.includes("jantar")) return "dining";
        if (lowerName.includes("🎁") || lowerName.includes("kit")) return "kit";

        return "default";
    };

    // Obter userId após confirmar que está autenticado
    var userId = AuthService.getUserId();

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
                if (!$scope.userStatus.pointCategories) {
                    $scope.userStatus.pointCategories = { moaimoney: 0 };
                }
            },
            function(error) {
                console.error('Failed to load user status:', error);
                alert('Falha ao carregar dados do usuário. Por favor, tente novamente.');
            }
        );
    };

    // Adicionar esta função para obter URL de imagem segura com fallback
    $scope.getSafeImageUrl = function(item) {
        // Se o item tem uma imagem válida
        if (item && item.image) {
            // Tentar diferentes tamanhos, com fallback para cada um
            if (item.image.medium && item.image.medium.url) {
                return item.image.medium.url;
            } else if (item.image.small && item.image.small.url) {
                return item.image.small.url;
            } else if (item.image.original && item.image.original.url) {
                return item.image.original.url;
            }
        }

        // Se não tiver imagem, usar um ícone baseado no tipo de item
        var itemType = $scope.getItemType(item ? item.name : '');
        var fallbackImage = 'public/img/rewards/' + itemType + '.png';

        // Verificar se a imagem existe usando Image() - isso não funciona bem no Angular
        // Em vez disso, usamos um tratamento de erro no HTML com onerror
        return fallbackImage;
    };

    // Load rewards items
    $scope.loadRewardItems = function() {
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
                console.log('Items loaded:', response.data);

                // Armazenar todos os itens (não apenas os de prêmios)
                var allItems = response.data;

                // Criar um mapeamento para consulta rápida
                allItems.forEach(function(item) {
                    // Pré-processar as imagens para garantir que temos um fallback
                    if (!item.safeImageUrl) {
                        item.safeImageUrl = $scope.getSafeImageUrl(item);
                    }

                    $scope.purchaseDetails[item._id] = item;
                    if (item.code) $scope.purchaseDetails[item.code] = item;
                });

                // Filter only items from "prizes" catalog para exibição
                $scope.rewardItems = response.data.filter(function(item) {
                    return item.catalogId === 'prizes';
                });

                console.log('Filtered prize items:', $scope.rewardItems);

                // Se já temos o histórico carregado, atualizar os detalhes
                if ($scope.purchases.length > 0) {
                    $scope.loadPurchasedItemDetails();
                }
            },
            function(error) {
                console.error('Failed to load items:', error);
                alert('Falha ao carregar itens da loja. Por favor, tente novamente.');
            }
        );
    };

    // Show item details in modal
    $scope.showItemDetails = function(item) {
        console.log('Abrindo modal para item:', item); // Log para debug
        $scope.selectedItem = item;
        $scope.modalVisible = true;

        // Verificar se o item pode ser comprado no momento da abertura do modal
        var canPurchase = $scope.canPurchaseItem(item);
        console.log("Item pode ser comprado:", canPurchase);

        // Garantir que a página role para o topo quando o modal abrir
        setTimeout(function() {
            // Garante que o modal seja exibido completamente
            window.scrollTo(0, 0);

            // Desabilitar rolagem do body para evitar rolagem dupla
            document.body.style.overflow = 'hidden';
        }, 100);
    };

    // Close modal
    $scope.closeModal = function() {
        console.log('Fechando modal de item'); // Log para debug
        $scope.modalVisible = false;

        // Reabilitar rolagem do body quando o modal fechar
        document.body.style.overflow = '';

        setTimeout(function() {
            $scope.$apply(function() {
                $scope.selectedItem = null;
            });
        }, 300); // Espera a animação terminar
    };

    // Corrigir a função de navegação
    $scope.navigate = function(path) {
        console.log("Navegando para:", path);
        $location.path(path);
    };

    // Nova função para verificar se um item pode ser comprado
    $scope.canPurchaseItem = function(item) {
        if (!item || !item.requires) return true;

        console.log('Verificando requisitos de compra para:', item.name);

        if (!$scope.userStatus) {
            console.log('Dados do usuário não disponíveis');
            return false;
        }

        // Verificar cada requisito
        for (var i = 0; i < item.requires.length; i++) {
            var req = item.requires[i];

            if (req.type === 0) { // Point requirement
                if (req.item === 'moaicoins') {
                    var currentAmount = $scope.userStatus.pointCategories.moaicoins || 0;
                    console.log('Requisito: ' + req.total + ' MOAIcoins, Disponível: ' + currentAmount);
                    if (currentAmount < req.total) {
                        console.log('Requisito de MOAIcoins não atendido: ' + currentAmount + ' < ' + req.total);
                        return false;
                    }
                } else if (req.item === 'moaimoney') {
                    var currentAmount = ($scope.userStatus.pointCategories && $scope.userStatus.pointCategories.moaimoney) || 0;
                    console.log('Requisito: ' + req.total + ' MOAImoney, Disponível: ' + currentAmount);
                    if (currentAmount < req.total) {
                        console.log('Requisito de MOAImoney não atendido: ' + currentAmount + ' < ' + req.total);
                        return false;
                    }
                }
            } else if (req.type === 3) { // Level requirement
                var userLevelNumber = $scope.getUserLevelNumber();
                var requiredLevelNumber = $scope.getLevelNumberFromId(req.item);
                console.log('Requisito: Nível ' + requiredLevelNumber + ', Usuário: Nível ' + userLevelNumber);

                if (userLevelNumber < requiredLevelNumber) {
                    console.log('Requisito de nível não atendido: ' + userLevelNumber + ' < ' + requiredLevelNumber);
                    return false;
                }
            }
        }

        console.log('Todos os requisitos atendidos, pode comprar');
        return true;
    };

    // Melhorar a lógica de verificação de compra
    $scope.purchaseItem = function(item) {
        console.log('Attempting to purchase item:', item);

        // Verificação completa novamente no momento da compra
        // Isso é uma redundância de segurança
        if (!$scope.canPurchaseItem(item)) {
            // Check if user has enough points/money
            var missingResource = '';
            var missingAmount = 0;
            var currentAmount = 0;

            // Check each requirement to determine what's missing
            for (var i = 0; i < item.requires.length; i++) {
                var req = item.requires[i];

                if (req.type === 0) { // Point requirement
                    if (req.item === 'moaicoins') {
                        currentAmount = $scope.userStatus.total_points || 0;
                        if (currentAmount < req.total) {
                            missingResource = 'MOAIcoins';
                            missingAmount = req.total - currentAmount;
                            break;
                        }
                    } else if (req.item === 'moaimoney') {
                        currentAmount = $scope.userStatus.pointCategories.moaimoney || 0;
                        if (currentAmount < req.total) {
                            missingResource = 'MOAImoney';
                            missingAmount = req.total - currentAmount;
                            break;
                        }
                    }
                } else if (req.type === 3) { // Level requirement
                    var userLevelNumber = $scope.getUserLevelNumber();
                    var requiredLevelNumber = $scope.getLevelNumberFromId(req.item);

                    if (userLevelNumber < requiredLevelNumber) {
                        missingResource = 'nível';
                        break;
                    }
                }
            }

            // Mensagem mais informativa de fundos insuficientes
            if (missingResource === 'nível') {
                alert('Você precisa atingir o ' + $scope.getLevelName(req.item) + ' para poder comprar este item.');
            } else {
                alert('Fundos insuficientes! Faltam ' + missingAmount + ' ' + missingResource +
                      ' para comprar este item.\nVocê tem: ' + currentAmount + ' ' + missingResource);
            }
            return; // IMPORTANTE: Esta linha impede que a compra continue
        }

        // Se chegamos aqui, podemos prosseguir com a compra na API
        var userId = AuthService.getUserId();

        // Mostrar indicador de carregamento
        $scope.isProcessing = true;

        // Log dos dados do item para debug
        console.log('Item details for purchase:', {
            itemId: item._id,
            itemName: item.name,
            itemCode: item.code || item._id, // Alguns sistemas usam 'code' em vez de '_id'
            userId: userId
        });

        // Usar o formato correto do item ID conforme documentação da API
        // Algumas APIs esperam o código curto em vez do ID completo
        var itemId = item.code || item._id;

        // Preparar requisição para API - Formato EXATO conforme documentação
        var req = {
            method: 'POST',
            url: 'https://service2.funifier.com/v3/virtualgoods/purchase',
            headers: {
                "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
                "Content-Type": "application/json"
            },
            data: {
                "player": userId,
                "item": itemId,
                "total": 1
            }
        };

        // Log da requisição completa para debug
        console.log('Purchase request:', JSON.stringify(req));

        $http(req).then(
            function(response) {
                console.log('Purchase successful:', response.data);
                $scope.isProcessing = false;

                // Exibir mensagem de sucesso
                alert('Compra realizada com sucesso!');

                // Fechar modal
                $scope.closeModal();

                // Atualizar saldo do usuário
                $scope.loadUserStatus();

                // Recarregar itens para atualizar disponibilidade
                $scope.loadRewardItems();

                // Registrar achievements obtidos
                if (response.data.achievements && response.data.achievements.length > 0) {
                    var pointsChange = response.data.achievements
                        .filter(function(a) { return a.type === 0; })
                        .map(function(a) { return a.item + ": " + a.total; })
                        .join(", ");

                    console.log("Alterações de pontos:", pointsChange);
                }
            },
            function(error) {
                console.error('Purchase failed:', error);

                // Log detalhado do erro para debug
                if (error.data) {
                    console.error('Error details:', error.data);
                }

                $scope.isProcessing = false;

                // Tratar diferentes tipos de erro
                var errorMessage = 'Falha ao processar a compra. Por favor, tente novamente.';

                if (error.status === 400) {
                    errorMessage = 'Não foi possível completar a compra: recursos insuficientes.';
                    if (error.data && error.data.message) {
                        errorMessage += ' ' + error.data.message;
                    }
                } else if (error.status === 401 || error.status === 403) {
                    errorMessage = 'Sem permissão para realizar esta compra. Tente fazer login novamente.';
                    // Opcional: Redirecionar para login
                    // AuthService.logout();
                } else if (error.status === 404) {
                    errorMessage = 'Item não encontrado ou indisponível.';
                } else if (error.status === 500) {
                    errorMessage = 'Erro no servidor. Por favor, tente novamente mais tarde.';
                }

                alert(errorMessage);
            }
        );
    };

    // Nova função para obter o número do nível atual do usuário
    $scope.getUserLevelNumber = function() {
        if (!$scope.userStatus || !$scope.userStatus.level) return 0;

        var userLevelId = $scope.userStatus.level._id;
        return $scope.getLevelNumberFromId(userLevelId);
    };

    // Nova função para converter ID do nível em número
    $scope.getLevelNumberFromId = function(levelId) {
        // Mapeia cada ID de nível para seu número correspondente
        var levelMap = {
            "682755212327f74f3a3d74e1": 1, // Nível 1
            "682755472327f74f3a3d74eb": 2, // Nível 2
            "682755582327f74f3a3d74ef": 3, // Nível 3
            "6827556b2327f74f3a3d74f7": 4, // Nível 4
            "682755752327f74f3a3d74f8": 5, // Nível 5
            "682755802327f74f3a3d74fa": 6, // Nível 6
            "6827558b2327f74f3a3d74fc": 7  // Nível 7
        };

        // Se não temos o ID no mapa, verificar se temos uma representação textual do nível
        if (!levelMap[levelId]) {
            if ($scope.userStatus && $scope.userStatus.level && $scope.userStatus.level.level) {
                // Extrair número do nível a partir do texto (ex: "Nível 3" -> 3)
                var levelMatch = $scope.userStatus.level.level.match(/\d+/);
                if (levelMatch) {
                    return parseInt(levelMatch[0], 10);
                }
            }
            return 0; // Nível desconhecido ou não disponível
        }

        return levelMap[levelId];
    };

    // Caches para evitar recálculos repetidos
    $scope.purchasePriceCache = {};
    $scope.deliveryStatusCache = {};
    $scope.itemNameCache = {};

    // Função para mostrar o histórico de compras
    $scope.showPurchaseHistory = function() {
        console.log("Exibindo histórico de compras");
        $scope.historyModalVisible = true;
        $scope.loadPurchaseHistory();
    };

    // Função para fechar o modal de histórico
    $scope.closeHistoryModal = function() {
        console.log("Fechando histórico de compras");
        $scope.historyModalVisible = false;
    };

    // Função para carregar o histórico de compras
    $scope.loadPurchaseHistory = function() {
        $scope.isLoadingHistory = true;

        var req = {
            method: 'GET',
            url: 'https://service2.funifier.com/v3/achievement',
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        $http(req).then(
            function(response) {
                console.log('Purchase history loaded:', response.data);

                // Filtrar apenas as compras (type=2) do usuário atual
                var allAchievements = response.data;
                var userId = AuthService.getUserId();

                // Primeiro, encontrar todas as compras de itens
                var userPurchases = allAchievements.filter(function(achievement) {
                    return achievement.player === userId && achievement.type === 2;
                });

                // Buscar o catálogo de todos os itens para filtrar por catálogo depois
                var itemsReq = {
                    method: 'GET',
                    url: API_CONFIG.baseUrl + '/virtualgoods/item',
                    headers: {
                        "Authorization": API_CONFIG.authHeader,
                        "Content-Type": "application/json"
                    }
                };

                $http(itemsReq).then(
                    function(itemsResponse) {
                        // Criar um mapa de ID para catálogo
                        var itemCatalogMap = {};
                        itemsResponse.data.forEach(function(item) {
                            itemCatalogMap[item._id] = item.catalogId;
                            if (item.code) {
                                itemCatalogMap[item.code] = item.catalogId;
                            }
                        });

                        // Filtrar apenas compras de itens do catálogo "prizes"
                        userPurchases = userPurchases.filter(function(purchase) {
                            return itemCatalogMap[purchase.item] === 'prizes';
                        });

                        // Para cada compra, encontrar os pagamentos associados (extras.origin)
                        userPurchases.forEach(function(purchase) {
                            var payments = allAchievements.filter(function(achievement) {
                                return achievement.type === 0 &&
                                       achievement.extra &&
                                       achievement.extra.origin === purchase._id;
                            });

                            // Adicionar as informações de pagamento à compra
                            purchase.payments = payments;

                            // Pré-calcular tudo o que precisamos para evitar recálculos durante o digest
                            $scope.getPurchasePrices(purchase);  // Isso popula o cache
                            $scope.isPurchaseDelivered(purchase); // Isso popula o cache
                            $scope.formatDate(purchase.time);    // Isso popula o cache
                        });

                        $scope.purchases = userPurchases;

                        // Carregar detalhes dos itens comprados
                        $scope.loadPurchasedItemDetails();

                        $scope.isLoadingHistory = false;
                    },
                    function(error) {
                        console.error('Failed to load items for filtering:', error);
                        $scope.isLoadingHistory = false;
                        alert('Falha ao carregar histórico de compras. Por favor, tente novamente.');
                    }
                );
            },
            function(error) {
                console.error('Failed to load purchase history:', error);
                $scope.isLoadingHistory = false;
                alert('Falha ao carregar histórico de compras. Por favor, tente novamente.');
            }
        );
    };

    // Função para carregar detalhes dos itens comprados
    $scope.loadPurchasedItemDetails = function() {
        // Criar uma lista de IDs de itens das compras
        var itemIds = [];
        $scope.purchases.forEach(function(purchase) {
            if (!$scope.itemNameCache[purchase.item]) {
                itemIds.push(purchase.item);
            }
        });

        if (itemIds.length === 0) return;

        // Verificar se já temos detalhes dos itens carregados
        if ($scope.rewardItems.length > 0) {
            // Criar um mapa de id -> item para facilitar a busca
            var itemMap = {};
            $scope.rewardItems.forEach(function(item) {
                if (item._id) itemMap[item._id] = item;
                if (item.code) itemMap[item.code] = item;
            });

            // Armazenar os detalhes dos itens comprados
            itemIds.forEach(function(itemId) {
                if (itemMap[itemId]) {
                    $scope.purchaseDetails[itemId] = itemMap[itemId];
                    $scope.itemNameCache[itemId] = itemMap[itemId].name;
                } else {
                    $scope.itemNameCache[itemId] = "Item #" + itemId;
                }
            });
        } else {
            // Se não temos detalhes, definir nomes padrão
            itemIds.forEach(function(itemId) {
                if (!$scope.itemNameCache[itemId]) {
                    $scope.itemNameCache[itemId] = "Item #" + itemId;
                }
            });
        }
    };

    // Cache para status de entrega
    $scope.deliveryStatusCache = {};

    // Função para verificar se uma compra foi entregue - versão memoizada
    $scope.isPurchaseDelivered = function(purchase) {
        // Verificar cache primeiro
        if ($scope.deliveryStatusCache[purchase._id] !== undefined) {
            return $scope.deliveryStatusCache[purchase._id];
        }

        // Por exemplo, verificar se a compra tem mais de 1 hora
        var currentTime = new Date().getTime();
        var purchaseTime = purchase.time;

        // Considerar entregue se a compra foi feita há mais de 1 hora (3.600.000 ms)
        var isDelivered = (currentTime - purchaseTime) > 3600000;

        // Armazenar em cache
        $scope.deliveryStatusCache[purchase._id] = isDelivered;
        return isDelivered;
    };

    // Cache para datas formatadas
    $scope.formattedDateCache = {};

    // Função para formatar a data da compra - versão memoizada
    $scope.formatDate = function(timestamp) {
        // Verificar cache primeiro
        if ($scope.formattedDateCache[timestamp] !== undefined) {
            return $scope.formattedDateCache[timestamp];
        }

        var date = new Date(timestamp);

        // Formatar como DD/MM/YYYY HH:MM
        var formattedDate = date.getDate().toString().padStart(2, '0') + '/' +
               (date.getMonth() + 1).toString().padStart(2, '0') + '/' +
               date.getFullYear() + ' ' +
               date.getHours().toString().padStart(2, '0') + ':' +
               date.getMinutes().toString().padStart(2, '0');

        // Armazenar em cache
        $scope.formattedDateCache[timestamp] = formattedDate;
        return formattedDate;
    };

    // Função para obter os preços de uma compra - versão memoizada
    $scope.purchasePriceCache = {};  // Cache para evitar recálculos repetidos

    $scope.getPurchasePrices = function(purchase) {
        // Verificar cache primeiro
        if ($scope.purchasePriceCache[purchase._id]) {
            return $scope.purchasePriceCache[purchase._id];
        }

        if (!purchase.payments || purchase.payments.length === 0) {
            $scope.purchasePriceCache[purchase._id] = [];
            return [];
        }

        // Agrupar os pagamentos por tipo de moeda para consolidar múltiplos
        // pagamentos do mesmo tipo (por exemplo, duas entradas de moaicoins)
        var priceMap = {};

        purchase.payments.forEach(function(payment) {
            var itemType = payment.item;
            if (!priceMap[itemType]) {
                priceMap[itemType] = 0;
            }
            // Converter valores negativos para positivos para exibição
            priceMap[itemType] += Math.abs(payment.total);
        });

        // Converter o mapa em um array para exibição
        var prices = [];
        for (var item in priceMap) {
            prices.push({
                item: item,
                total: priceMap[item]
            });
        }

        // Ordenar para que moaicoins apareçam sempre primeiro
        prices.sort(function(a, b) {
            if (a.item === 'moaicoins') return -1;
            if (b.item === 'moaicoins') return 1;
            return 0;
        });

        // Armazenar em cache
        $scope.purchasePriceCache[purchase._id] = prices;
        return prices;
    };

    // Adicione esta função após a função formatDate
    $scope.getPurchaseName = function(purchase) {
        if (!purchase || !purchase.item) return "Item desconhecido";

        // Primeiro verificar no cache
        if ($scope.itemNameCache[purchase.item]) {
            return $scope.itemNameCache[purchase.item];
        }

        // Se não está em cache mas temos detalhes do item
        if ($scope.purchaseDetails[purchase.item] && $scope.purchaseDetails[purchase.item].name) {
            var name = $scope.purchaseDetails[purchase.item].name;
            $scope.itemNameCache[purchase.item] = name;
            return name;
        }

        // Se não temos o nome, retornar um placeholder com o ID
        return "Item #" + purchase.item.substring(0, 8);
    };

    // Adicionar após a função getPurchaseName
    $scope.getPurchaseDetails = function(purchase) {
        if (!purchase || !purchase.item) return null;

        // Verificar se temos os detalhes em cache
        if ($scope.purchaseDetails[purchase.item]) {
            return $scope.purchaseDetails[purchase.item];
        }

        // Se não temos os detalhes, retornar null
        return null;
    };

    // Load data on controller initialization
    $scope.loadUserStatus();
    $scope.loadRewardItems();
});
