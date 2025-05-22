angular.module('moaiApp').controller('DevelopmentController', function($scope, $http, $timeout, $location, API_CONFIG, AuthService) {
    // Aplicar a classe development-page ao corpo para o espaçamento correto
    angular.element(document.body).addClass('development-page');

    // Remover a classe quando sair da página
    $scope.$on('$destroy', function() {
        angular.element(document.body).removeClass('development-page');
    });

    // Verificação de autenticação usando o serviço
    if (!AuthService.checkAuthentication()) {
        console.log("Autenticação falhou - redirecionando para login");
        return; // O serviço já redireciona para login
    }

    // Inicializar recursos e modais
    var participationModal, toolModal, readModal;

    // Controlar se os modais estão abertos
    $scope.modalStates = {
        participation: false,
        tool: false,
        read: false
    };

    // Iniciar modals Bootstrap quando o DOM estiver pronto
    $timeout(function() {
        participationModal = new bootstrap.Modal(document.getElementById('participationModal'), {
            backdrop: 'static', // Não fecha ao clicar fora
            keyboard: false // Não fecha com ESC
        });

        toolModal = new bootstrap.Modal(document.getElementById('toolModal'), {
            backdrop: 'static',
            keyboard: false
        });

        readModal = new bootstrap.Modal(document.getElementById('readModal'), {
            backdrop: 'static',
            keyboard: false
        });

        // Adicionar listeners para os eventos de modal
        document.getElementById('participationModal').addEventListener('hidden.bs.modal', function() {
            $scope.modalStates.participation = false;
        });

        document.getElementById('toolModal').addEventListener('hidden.bs.modal', function() {
            $scope.modalStates.tool = false;
        });

        document.getElementById('readModal').addEventListener('hidden.bs.modal', function() {
            $scope.modalStates.read = false;
        });
    }, 0);

    // Inicializar recursos do usuário
    $scope.userResources = {
        energia: 0,
        ferramenta: 0,
        criatividade: 0
    };

    // Recursos prontos para colheita
    $scope.readyResources = [];

    // Mapeamento de ações para recursos
    $scope.actionToResource = {
        'participation': 'energia',
        'tool': 'ferramenta',
        'read': 'criatividade'
    };

    // Mapeamento de recursos para ações (inverso do anterior)
    $scope.resourceToAction = {
        'energia': 'participation',
        'ferramenta': 'tool',
        'criatividade': 'read'
    };

    // Armazenar atividades do usuário
    $scope.userActivities = [];

    // Indicador de carregamento para API
    $scope.isLoading = {
        resources: false,
        activities: false,
        action: false
    };

    // Carregar recursos do usuário
    $scope.loadUserResources = function() {
        $scope.isLoading.resources = true;
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
                $scope.isLoading.resources = false;

                // Verificar se os recursos existem na resposta
                if (response.data.pointCategories || response.data.point_categories) {
                    // API pode retornar pointCategories ou point_categories
                    var categories = response.data.pointCategories || response.data.point_categories;

                    $scope.userResources.energia = categories.energia || 0;
                    $scope.userResources.ferramenta = categories.ferramenta || 0;
                    $scope.userResources.criatividade = categories.criatividade || 0;

                    console.log('Recursos carregados:', $scope.userResources);
                    $scope.ensurePositiveResources();
                }

                // Carregar atividades do usuário
                $scope.loadUserActivities();
            },
            function(error) {
                console.error('Falha ao carregar recursos do usuário:', error);
                $scope.isLoading.resources = false;
                alert('Não foi possível carregar seus recursos. Por favor, tente novamente mais tarde.');
            }
        );
    };

    // Função para abrir o modal de recurso adequado
    $scope.openResourceModal = function(resourceType) {
        switch(resourceType) {
            case 'participation':
                $scope.modalStates.participation = true;
                participationModal.show();
                break;
            case 'tool':
                $scope.modalStates.tool = true;
                toolModal.show();
                break;
            case 'read':
                $scope.modalStates.read = true;
                readModal.show();
                break;
        }
    };

    // Função para registrar uma ação na API e ganhar recursos
    $scope.logAction = function(actionId, source) {
        // Evitar múltiplos cliques
        if ($scope.isLoading.action) return;

        $scope.isLoading.action = true;
        var userId = AuthService.getUserId();

        var req = {
            method: 'POST',
            url: 'https://service2.funifier.com/v3/action/log',
            headers: {
                "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
                "Content-Type": "application/json"
            },
            data: {
                "actionId": actionId,
                "userId": userId,
                "context": {
                    "source": source,
                    "timestamp": new Date().getTime()
                }
            }
        };

        $http(req).then(
            function(response) {
                console.log('Ação registrada com sucesso:', response.data);
                $scope.isLoading.action = false;

                // Adicionar a nova atividade à lista com classe de animação
                var newActivity = response.data;
                newActivity.isNew = true; // Flag para animação
                $scope.userActivities.unshift(newActivity);

                // Limitar a lista a 10 itens
                if ($scope.userActivities.length > 10) {
                    $scope.userActivities.pop();
                }

                // Adicionar recurso pronto para colheita com um delay
                $timeout(function() {
                    // Gerar sempre 1 unidade de recurso por ação
                    var resourceType = $scope.actionToResource[actionId];
                    var amount = 1; // Fixado em 1 unidade

                    var newResource = {
                        id: 'resource_' + new Date().getTime(),
                        type: resourceType,
                        amount: amount,
                        timestamp: new Date().getTime()
                    };

                    $scope.readyResources.push(newResource);

                    // Salvar no localStorage
                    if ($scope.isLocalStorageAvailable()) {
                        localStorage.setItem('readyResources', JSON.stringify($scope.readyResources));
                    }

                    // Forçar atualização da view
                    $scope.$apply();
                }, 3000); // Delay de 3 segundos para melhor UX

                // Mostrar feedback visual
                showActionFeedback(actionId, source);

                // Remover a classe de animação após 2 segundos
                $timeout(function() {
                    if ($scope.userActivities.length > 0 && $scope.userActivities[0].isNew) {
                        $scope.userActivities[0].isNew = false;
                    }
                }, 2000);
            },
            function(error) {
                console.error('Falha ao registrar ação:', error);
                $scope.isLoading.action = false;
                closeAllModals();
                alert('Não foi possível registrar sua ação. Por favor, tente novamente mais tarde.');
            }
        );
    };

    // Função auxiliar para fechar todos os modais
    function closeAllModals() {
        if ($scope.modalStates.participation) {
            participationModal.hide();
            $scope.modalStates.participation = false;
        }
        if ($scope.modalStates.tool) {
            toolModal.hide();
            $scope.modalStates.tool = false;
        }
        if ($scope.modalStates.read) {
            readModal.hide();
            $scope.modalStates.read = false;
        }
    }

    // Função para mostrar feedback visual quando uma ação é registrada
    function showActionFeedback(actionId, source) {
        // Fechar o modal após um pequeno delay
        $timeout(function() {
            switch(actionId) {
                case 'participation':
                    if (participationModal) {
                        participationModal.hide();
                        $scope.modalStates.participation = false;
                    }
                    break;
                case 'tool':
                    if (toolModal) {
                        toolModal.hide();
                        $scope.modalStates.tool = false;
                    }
                    break;
                case 'read':
                    if (readModal) {
                        readModal.hide();
                        $scope.modalStates.read = false;
                    }
                    break;
            }
        }, 100);

        // Construir texto baseado no tipo de ação
        var actionText = '';
        var iconClass = '';
        var resourceName = '';

        switch(actionId) {
            case 'participation':
                actionText = 'Participação registrada em ' + source;
                iconClass = 'energy-icon';
                resourceName = 'Energia';
                break;
            case 'tool':
                actionText = 'Insight compartilhado no ' + source;
                iconClass = 'tools-icon';
                resourceName = 'Ferramenta';
                break;
            case 'read':
                actionText = 'Leitura/estudo registrado no ' + source;
                iconClass = 'creativity-icon';
                resourceName = 'Criatividade';
                break;
        }

        // Criar ID único para este toast
        var toastId = 'toast-' + new Date().getTime();

        // Mostrar toast/notificação com ícone
        var toast = `
            <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 5000">
                <div id="${toastId}" class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header">
                        <div class="me-2 ${iconClass}" style="font-size: 1.2rem;">
                            ${actionId === 'participation' ? '⚡' : actionId === 'tool' ? '🔧' : '💡'}
                        </div>
                        <strong class="me-auto">Ação Concluída!</strong>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close" onclick="document.getElementById('${toastId}').remove()"></button>
                    </div>
                    <div class="toast-body">
                        ${actionText}<br>
                        <strong>Recurso gerado!</strong> Veja na seção "Recursos Prontos".
                    </div>
                </div>
            </div>
        `;

        // Adicionar o toast ao DOM
        var toastElement = angular.element(toast);
        angular.element(document.body).append(toastElement);

        // Remover após 4 segundos (aumentado para dar mais tempo para ler)
        $timeout(function() {
            var existingToast = document.getElementById(toastId);
            if (existingToast) {
                existingToast.remove();
            }
        }, 4000);
    }

    // Carregar as atividades recentes do usuário
    $scope.loadUserActivities = function() {
        $scope.isLoading.activities = true;
        var userId = AuthService.getUserId();

        var req = {
            method: 'GET',
            url: 'https://service2.funifier.com/v3/action/log',
            headers: {
                "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
                "Content-Type": "application/json"
            }
        };

        $http(req).then(
            function(response) {
                console.log('Todas as atividades carregadas:', response.data);

                // Filtrar apenas as atividades do usuário atual
                // e apenas as ações relevantes para a página de desenvolvimento
                var filteredActivities = response.data.filter(function(activity) {
                    return activity.userId === userId &&
                           (activity.actionId === 'participation' ||
                            activity.actionId === 'tool' ||
                            activity.actionId === 'read');
                });

                // Ordenar por data, do mais recente para o mais antigo
                filteredActivities.sort(function(a, b) {
                    return b.time - a.time;
                });

                // Limitar a 10 itens
                filteredActivities = filteredActivities.slice(0, 10);

                console.log('Atividades do usuário carregadas:', filteredActivities);
                $scope.userActivities = filteredActivities;
                $scope.isLoading.activities = false;
            },
            function(error) {
                console.error('Falha ao carregar atividades do usuário:', error);
                $scope.isLoading.activities = false;
                // Não mostra alerta para não interromper a experiência do usuário
            }
        );
    };

    // Função para obter o nome legível da atividade
    $scope.getActivityName = function(actionId) {
        switch(actionId) {
            case 'participation':
                return 'Participação em evento/mentoria';
            case 'tool':
                return 'Insight compartilhado';
            case 'read':
                return 'Conteúdo estudado';
            default:
                return 'Ação realizada';
        }
    };

    // Formatar data para exibição
    $scope.formatDate = function(timestamp) {
        if (!timestamp) return "N/A";
        var date = new Date(timestamp);
        return date.toLocaleDateString('pt-BR') + ' às ' + date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
    };

    // Função para garantir que os recursos não fiquem negativos
    $scope.ensurePositiveResources = function() {
        $scope.userResources.energia = Math.max(0, $scope.userResources.energia);
        $scope.userResources.ferramenta = Math.max(0, $scope.userResources.ferramenta);
        $scope.userResources.criatividade = Math.max(0, $scope.userResources.criatividade);
    };

    // Verificar se o localStorage está disponível
    $scope.isLocalStorageAvailable = function() {
        try {
            var test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch(e) {
            return false;
        }
    };

    // Função para fechar um modal específico (para os botões de fechar)
    $scope.closeModal = function(modalType) {
        switch(modalType) {
            case 'participation':
                participationModal.hide();
                $scope.modalStates.participation = false;
                break;
            case 'tool':
                toolModal.hide();
                $scope.modalStates.tool = false;
                break;
            case 'read':
                readModal.hide();
                $scope.modalStates.read = false;
                break;
        }
    };

    // Função para navegar para outra página
    $scope.navigate = function(path) {
        console.log("Navegando para:", path);
        $location.path(path);
    };

    // Carregar recursos prontos do localStorage
    $scope.loadReadyResources = function() {
        if (!$scope.isLocalStorageAvailable()) {
            console.warn('LocalStorage não está disponível. Os recursos não serão persistidos entre sessões.');
            return;
        }

        var savedResources = localStorage.getItem('readyResources');

        if (savedResources) {
            try {
                $scope.readyResources = JSON.parse(savedResources);
            } catch (e) {
                console.error('Erro ao carregar recursos prontos:', e);
                $scope.readyResources = [];
            }
        } else {
            $scope.readyResources = [];
        }
    };

    // Função para colher um recurso
    $scope.harvestResource = function(resource) {
        var userId = AuthService.getUserId();

        // Adicionar classe de animação ao elemento
        var element = document.getElementById('resource-' + resource.id);
        if (element) {
            element.classList.add('harvesting');
        }

        // Aguardar um momento para a animação de colheita começar antes de chamar a API
        $timeout(function() {
            var req = {
                method: 'POST',
                url: 'https://service2.funifier.com/v3/point/add',
                headers: {
                    "Authorization": "Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw==",
                    "Content-Type": "application/json"
                },
                data: {
                    "player": userId,
                    "category": resource.type,
                    "total": resource.amount
                }
            };

            $http(req).then(
                function(response) {
                    console.log('Recurso colhido com sucesso:', response.data);

                    // Atualizar o contador local do recurso APÓS a confirmação da API
                    $scope.userResources[resource.type] += resource.amount;

                    // Remover o recurso da lista de recursos prontos
                    $scope.readyResources = $scope.readyResources.filter(function(r) {
                        return r.id !== resource.id;
                    });

                    // Salvar a lista atualizada no localStorage
                    if ($scope.isLocalStorageAvailable()) {
                        localStorage.setItem('readyResources', JSON.stringify($scope.readyResources));
                    }

                    // Mostrar feedback visual
                    showHarvestFeedback(resource);
                },
                function(error) {
                    console.error('Falha ao colher recurso:', error);

                    // Remover classe de animação
                    if (element) {
                        element.classList.remove('harvesting');
                    }

                    alert('Não foi possível colher o recurso. Por favor, tente novamente mais tarde.');
                }
            );
        }, 300); // Pequeno delay para a animação começar
    };

    // Função para mostrar feedback visual quando um recurso é colhido
    function showHarvestFeedback(resource) {
        var resourceName = "";
        var iconClass = "";

        switch(resource.type) {
            case 'energia':
                resourceName = "Energia";
                iconClass = "energy-icon";
                break;
            case 'ferramenta':
                resourceName = "Ferramenta";
                iconClass = "tools-icon";
                break;
            case 'criatividade':
                resourceName = "Criatividade";
                iconClass = "creativity-icon";
                break;
        }

        var toastId = 'toast-harvest-' + new Date().getTime();

        var toast = `
            <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 5000">
                <div id="${toastId}" class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header">
                        <div class="me-2 ${iconClass}" style="font-size: 1.2rem;">
                            ${resource.type === 'energia' ? '⚡' : resource.type === 'ferramenta' ? '🔧' : '💡'}
                        </div>
                        <strong class="me-auto">Recurso Colhido!</strong>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close" onclick="document.getElementById('${toastId}').remove()"></button>
                    </div>
                    <div class="toast-body">
                        Você colheu ${resource.amount} ${resourceName} e ganhou 1 ponto em seu inventário.
                    </div>
                </div>
            </div>
        `;

        var toastElement = angular.element(toast);
        angular.element(document.body).append(toastElement);

        $timeout(function() {
            var existingToast = document.getElementById(toastId);
            if (existingToast) {
                existingToast.remove();
            }
        }, 3500); // Aumentado para 3.5 segundos para dar mais tempo para ler
    }

    // Obter nome legível do recurso
    $scope.getResourceName = function(resourceType) {
        switch(resourceType) {
            case 'energia':
                return 'Energia';
            case 'ferramenta':
                return 'Ferramenta';
            case 'criatividade':
                return 'Criatividade';
            default:
                return resourceType;
        }
    };

    // Adicionar esta função para obter detalhes da ação com base no actionId
    $scope.getActionDetails = function(activity) {
        var details = {
            icon: '',
            name: '',
            description: '',
            iconClass: ''
        };

        switch(activity.actionId) {
            case 'participation':
                details.icon = '⚡';
                details.name = 'Participação em evento/mentoria';
                details.description = activity.context && activity.context.source ?
                    'Via ' + activity.context.source : 'Participação registrada';
                details.iconClass = 'energy-icon';
                break;
            case 'tool':
                details.icon = '🔧';
                details.name = 'Insight compartilhado';
                details.description = activity.context && activity.context.source ?
                    'Em ' + activity.context.source : 'Ferramenta criada';
                details.iconClass = 'tools-icon';
                break;
            case 'read':
                details.icon = '💡';
                details.name = 'Conteúdo estudado';
                details.description = activity.context && activity.context.source ?
                    'Em ' + activity.context.source : 'Leitura registrada';
                details.iconClass = 'creativity-icon';
                break;
            default:
                details.icon = '📝';
                details.name = 'Ação realizada';
                details.description = 'Atividade registrada';
                details.iconClass = '';
        }

        return details;
    };

    // Inicializar carregando recursos do usuário
    $scope.loadUserResources();

    // Carregar recursos prontos do localStorage
    $scope.loadReadyResources();
});
