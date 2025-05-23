angular.module('moaiApp').controller('OnboardingController', function($scope, $http, $location, $timeout, API_CONFIG, AuthService) {
    // Aplicar a classe onboarding-page ao corpo
    angular.element(document.body).addClass('onboarding-page');

    // Função para limpar backdrops
    function removeBackdrops() {
        var backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(function(backdrop) {
            backdrop.parentNode.removeChild(backdrop);
        });
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    // Remover a classe e os backdrops quando sair da página
    $scope.$on('$destroy', function() {
        angular.element(document.body).removeClass('onboarding-page');
        removeBackdrops();
    });

    // Verificação de autenticação
    if (!AuthService.checkAuthentication()) {
        console.log("Autenticação falhou - redirecionando para login");
        return;
    }

    // Inicialização de variáveis
    $scope.currentStep = 1;
    $scope.totalSteps = 3;
    $scope.islandName = "";
    $scope.nameError = false;
    $scope.isProcessing = false;

    // Referências para os modais
    var welcomeModal, explanationModal, islandNameModal;

    // Modificar o Bootstrap Modal para não criar backdrops
    var originalModalShow = bootstrap.Modal.prototype.show;
    bootstrap.Modal.prototype.show = function() {
        // Chamar o método original
        originalModalShow.call(this);

        // Remover o backdrop logo após exibir o modal
        $timeout(function() {
            removeBackdrops();
        }, 50);
    };

    // Usar $timeout para garantir que o DOM esteja completamente carregado
    $timeout(function() {
        try {
            // Inicializar os modais com opções personalizadas
            welcomeModal = new bootstrap.Modal(document.getElementById('welcomeModal'), {
                backdrop: false,  // Alterar para false
                keyboard: false
            });

            explanationModal = new bootstrap.Modal(document.getElementById('explanationModal'), {
                backdrop: false,  // Alterar para false
                keyboard: false
            });

            islandNameModal = new bootstrap.Modal(document.getElementById('islandNameModal'), {
                backdrop: false,  // Alterar para false
                keyboard: false
            });

            console.log("Modais inicializados com sucesso");

            // Mostrar o primeiro modal após um pequeno delay
            $timeout(function() {
                welcomeModal.show();
                // Remover qualquer backdrop que possa ter sido criado
                removeBackdrops();
                console.log("Modal de boas-vindas exibido");
            }, 300);

        } catch (error) {
            console.error("Erro ao inicializar modais:", error);
        }
    }, 100);

    // Avançar para o próximo passo do onboarding
    $scope.nextStep = function() {
        console.log("Avançando para o passo " + ($scope.currentStep + 1));
        $scope.currentStep++;

        if ($scope.currentStep === 2) {
            if (welcomeModal) welcomeModal.hide();
            $timeout(function() {
                if (explanationModal) explanationModal.show();
                // Remover qualquer backdrop após exibir o modal
                removeBackdrops();
            }, 500);
        } else if ($scope.currentStep === 3) {
            if (explanationModal) explanationModal.hide();
            $timeout(function() {
                if (islandNameModal) islandNameModal.show();
                // Remover qualquer backdrop após exibir o modal
                removeBackdrops();
            }, 500);
        }
    };

    // Voltar para o passo anterior
    $scope.previousStep = function() {
        console.log("Voltando para o passo " + ($scope.currentStep - 1));
        $scope.currentStep--;

        if ($scope.currentStep === 1) {
            if (explanationModal) explanationModal.hide();
            $timeout(function() {
                if (welcomeModal) welcomeModal.show();
                // Remover qualquer backdrop após exibir o modal
                removeBackdrops();
            }, 500);
        } else if ($scope.currentStep === 2) {
            if (islandNameModal) islandNameModal.hide();
            $timeout(function() {
                if (explanationModal) explanationModal.show();
                // Remover qualquer backdrop após exibir o modal
                removeBackdrops();
            }, 500);
        }
    };

    // Concluir o onboarding e definir o nome da ilha
    $scope.finishOnboarding = function() {
        console.log("Finalizando onboarding");

        // Verificar se o nome da ilha foi fornecido
        if (!$scope.islandName || $scope.islandName.trim() === "") {
            $scope.nameError = true;
            return;
        }

        // Limpar erro se existir
        $scope.nameError = false;
        $scope.isProcessing = true;

        var userId = AuthService.getUserId();

        if (!userId) {
            console.error("ID do usuário não encontrado");
            $scope.isProcessing = false;
            alert("Ocorreu um erro ao salvar suas informações. Por favor, tente fazer login novamente.");
            $location.path('/');
            return;
        }

        console.log("Nome da ilha:", $scope.islandName);

        // Obter primeiro o perfil completo do usuário
        var getProfileRequest = {
            method: 'GET',
            url: API_CONFIG.baseUrl + '/player/' + userId,
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        $http(getProfileRequest).then(
            function(response) {
                console.log('Perfil do usuário carregado:', response.data);

                // Criar uma cópia do perfil para atualização
                var updatedProfile = angular.copy(response.data);

                // Garantir que o objeto extra exista
                if (!updatedProfile.extra) {
                    updatedProfile.extra = {};
                }

                // Atualizar o nome da ilha e marcar onboarding como concluído
                updatedProfile.extra.ilha = $scope.islandName;
                updatedProfile.extra.onboarding = false;

                // Salvar o perfil atualizado
                var updateRequest = {
                    method: 'PUT',
                    url: API_CONFIG.baseUrl + '/player/' + userId,
                    headers: {
                        "Authorization": API_CONFIG.authHeader,
                        "Content-Type": "application/json"
                    },
                    data: updatedProfile
                };

                return $http(updateRequest);
            }
        ).then(
            function(updateResponse) {
                console.log('Perfil atualizado com sucesso:', updateResponse.data);

                // Limpar backdrops antes de redirecionar
                removeBackdrops();

                $timeout(function() {
                    $scope.isProcessing = false;
                    $location.path('/firstupgrade');
                }, 1000);
            }
        ).catch(
            function(error) {
                console.error('Erro ao atualizar perfil:', error);
                $scope.isProcessing = false;

                var errorMsg = 'Ocorreu um erro ao salvar suas informações.';
                if (error.data && error.data.message) {
                    errorMsg += ' ' + error.data.message;
                }

                alert(errorMsg);
            }
        );
    };
});
