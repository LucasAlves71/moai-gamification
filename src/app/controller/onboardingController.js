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

    // Adicionar variáveis para controle de upload de foto
    $scope.previewImageUrl = null;
    $scope.showImageCropper = false;
    $scope.profileImageRequired = true; // Tornar a imagem obrigatória
    $scope.hasProfileImage = false; // Flag para indicar se o usuário já adicionou uma imagem
    $scope.selectedImageUrl = null; // Armazenar a URL da imagem após o upload

    // Abre o seletor de arquivo quando o botão de editar foto é clicado
    $scope.openFileSelector = function() {
        document.getElementById('onboarding-photo-input').click();
    };

    // Lida com a seleção de arquivos para upload de foto de perfil
    $scope.handleFileSelect = function(fileInput) {
        if (fileInput.files && fileInput.files[0]) {
            var file = fileInput.files[0];

            // Validar tamanho e tipo do arquivo
            if (file.size > 5 * 1024 * 1024) { // 5MB
                alert('A imagem é muito grande. O tamanho máximo é 5MB.');
                return;
            }

            if (!file.type.match('image.*')) {
                alert('Por favor, selecione uma imagem válida.');
                return;
            }

            $scope.isProcessing = true;

            var reader = new FileReader();
            reader.onload = function(e) {
                // Mostrar preview da imagem
                $scope.$apply(function() {
                    $scope.previewImageUrl = e.target.result;
                    $scope.showImageCropper = true;
                });
            };
            reader.readAsDataURL(file);
        }
    };

    // Método para upload da imagem após cropping
    $scope.uploadProfileImage = function(imageDataUrl) {
        $scope.isProcessing = true;

        // Converter dataURL para Blob para envio
        var blob = dataURItoBlob(imageDataUrl);
        var formData = new FormData();
        formData.append('file', new File([blob], 'profile.jpg'));

        // Configuração para thumbnails
        var extraData = {
            session: 'avatar',
            thumbnails: [
                { name: 'small', width: 160, height: 160 },
                { name: 'medium', width: 260, height: 260 }
            ]
        };
        formData.append('extra', JSON.stringify(extraData));

        // Fazer upload do arquivo para o endpoint de upload genérico
        $http({
            method: 'POST',
            url: API_CONFIG.baseUrl + '/upload/file',
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": undefined // Deixar o browser definir o content-type para multipart/form-data
            },
            data: formData
        }).then(
            function(response) {
                console.log('Upload de arquivo realizado com sucesso:', response.data);

                if (response.data.status === 'OK' && response.data.uploads && response.data.uploads.length > 0) {
                    // Obter a URL da imagem do resultado do upload
                    var imageUrl = response.data.uploads[0].url;
                    $scope.selectedImageUrl = imageUrl;
                    $scope.hasProfileImage = true;

                    // Fechar o cropper e mostrar imagem selecionada
                    $scope.showImageCropper = false;
                    $scope.isProcessing = false;
                } else {
                    console.error('Resposta de upload inválida:', response.data);
                    $scope.isProcessing = false;
                    $scope.showImageCropper = false;
                    alert('Falha ao processar a imagem. Por favor, tente novamente.');
                }
            },
            function(error) {
                console.error('Falha no upload da imagem:', error);
                $scope.isProcessing = false;
                $scope.showImageCropper = false;
                alert('Não foi possível fazer upload da sua foto. Por favor, tente novamente mais tarde.');
            }
        );
    };

    // Função para cancelar o upload
    $scope.cancelImageUpload = function() {
        $scope.showImageCropper = false;
        $scope.previewImageUrl = null;
        $scope.isProcessing = false;
    };

    // Função para converter Data URI para Blob
    function dataURItoBlob(dataURI) {
        // Converter base64 para raw binary data como string
        var byteString = atob(dataURI.split(',')[1]);

        // Separar o content type
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

        // Escrever os bytes da string em um ArrayBuffer
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        // Criar um blob com os dados e seu tipo
        return new Blob([ab], {type: mimeString});
    }

    // Concluir o onboarding e definir o nome da ilha
    $scope.finishOnboarding = function() {
        console.log("Finalizando onboarding");

        // Verificar se o nome da ilha foi fornecido
        if (!$scope.islandName || $scope.islandName.trim() === "") {
            $scope.nameError = true;
            return;
        }

        // Verificar se a foto de perfil foi adicionada (se obrigatória)
        if ($scope.profileImageRequired && !$scope.hasProfileImage) {
            alert("Por favor, adicione uma foto de perfil para continuar.");
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
