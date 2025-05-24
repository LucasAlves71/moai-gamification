angular.module('moaiApp').controller('OnboardingController', function($scope, $http, $location, $timeout, API_CONFIG, AuthService) {
    // Aplicar a classe onboarding-page ao corpo
    angular.element(document.body).addClass('onboarding-page');

    // Remover a classe quando sair da página
    $scope.$on('$destroy', function() {
        angular.element(document.body).removeClass('onboarding-page');
    });

    // Verificação de autenticação
    if (!AuthService.checkAuthentication()) {
        console.log("Autenticação falhou - redirecionando para login");
        return;
    }

    // Inicialização de variáveis
    $scope.currentStep = 1;
    $scope.totalSteps = 11;
    $scope.islandName = "";
    $scope.nameError = false;
    $scope.isProcessing = false;
    $scope.selectedImageUrl = null;
    $scope.hasProfileImage = false;
    $scope.showImageCropper = false;
    $scope.previewImageUrl = null;

    // Dados do discurso do personagem Manu'Kai
    $scope.speechData = [
        {
            title: "Bem-vindo ao Arquipélago.",
            text: "Sou Manu'Kai. Estou nesta ilha desde que os primeiros Moais foram esculpidos..."
        },
        {
            title: "Sei como te ajudar.",
            text: "Já guiei muitos antes de você. Agora, é sua vez. Estarei com você nesta jornada."
        },
        {
            title: "Você acaba de chegar.",
            text: "Desembarcou em sua ilha... mas não se engane."
        },
        {
            title: "Você ainda não é um Moai.",
            text: "Por enquanto, você é apenas o escultor. Mas está prestes a se transformar."
        },
        {
            title: "Seu objetivo é esculpir o seu próprio Moai.",
            text: "E ao fazer isso, deixar um legado que ressoe por gerações."
        },
        {
            title: "Cada etapa aqui dentro reflete sua evolução lá fora.",
            text: "Este não é apenas um jogo. É um reflexo da sua jornada real."
        },
        {
            title: "No mundo real, as pessoas que você mais ama...",
            text: "... estão esperando pelo seu progresso. Elas sentem quando você cresce."
        },
        {
            title: "Para esculpir seu Moai e criar seu legado...",
            text: "Você vai enfrentar desafios, visitar ilhas de conhecimento, realizar atividades e coletar recursos."
        },
        {
            title: "Cada recurso tem um propósito.",
            text: "E você vai descobrir como usá-los ao longo da sua jornada."
        },
        {
            title: "Agora que você chegou...",
            text: "Escolha um nome para sua ilha e adicione uma imagem. Assim, os outros jogadores saberão quem é você."
        },
        {
            title: "Veja! Os habitantes de outras ilhas te enviaram um presente.",
            text: "Um bloco de pedra. É nele que você começará a esculpir o seu legado."
        }
    ];

    // Avançar para o próximo passo
    $scope.nextStep = function() {
        if ($scope.currentStep < $scope.totalSteps) {
            $scope.currentStep++;
            playStepAnimation();

            // Se estiver indo para a última etapa (formulário), garantir que a página possa rolar
            if ($scope.currentStep === 11) {
                // Pequeno timeout para aguardar a renderização do DOM
                $timeout(function() {
                    // Rolar para o topo da página
                    window.scrollTo(0, 0);

                    // Garantir que o container tenha overflow-y: auto
                    var container = document.querySelector('.onboarding-container');
                    if (container) {
                        container.style.overflowY = 'auto';
                    }
                }, 100);
            }
        }
    };

    // Voltar para o passo anterior
    $scope.previousStep = function() {
        if ($scope.currentStep > 1) {
            $scope.currentStep--;
            playStepAnimation();

            // Se estiver voltando do formulário, restaurar o overflow
            if ($scope.currentStep === 10) {
                var container = document.querySelector('.onboarding-container');
                if (container) {
                    container.style.overflowY = 'auto';
                }
            }
        }
    };

    // Função para tocar animação na troca de passo
    function playStepAnimation() {
        // Poderia adicionar efeitos de transição aqui
        // Por exemplo, animações ou sons
    }

    // Abrir o seletor de arquivos para a foto de perfil
    $scope.openFileSelector = function() {
        document.getElementById('onboarding-photo-input').click();
    };

    // Manipular a seleção de arquivo
    $scope.handleFileSelect = function(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();

            reader.onload = function(e) {
                $scope.$apply(function() {
                    $scope.previewImageUrl = e.target.result;
                    $scope.showImageCropper = true;
                });
            };

            reader.readAsDataURL(input.files[0]);
        }
    };

    // Cancelar upload de imagem
    $scope.cancelImageUpload = function() {
        $scope.showImageCropper = false;
        $scope.previewImageUrl = null;
    };

    // Após cortar a imagem
    $scope.uploadProfileImage = function(imageDataUrl) {
        $scope.selectedImageUrl = imageDataUrl;
        $scope.hasProfileImage = true;
        $scope.showImageCropper = false;
    };

    // Finalizar o onboarding
    $scope.finishOnboarding = function() {
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
        console.log("Imagem de perfil:", $scope.selectedImageUrl);

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

                // Adicionar a imagem ao perfil se disponível
                if ($scope.selectedImageUrl) {
                    updatedProfile.image = {
                        small: { url: $scope.selectedImageUrl },
                        medium: { url: $scope.selectedImageUrl },
                        original: { url: $scope.selectedImageUrl }
                    };
                }

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
