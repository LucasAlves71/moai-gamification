angular.module('moaiApp').controller('ProfileController', function($scope, $http, $location, API_CONFIG, AuthService) {
    console.log("ProfileController iniciado");

    // Aplicar a classe profile-page ao corpo para o espaçamento correto
    angular.element(document.body).addClass('profile-page');

    // Remover a classe quando sair da página
    $scope.$on('$destroy', function() {
        angular.element(document.body).removeClass('profile-page');
    });

    // Verificação de autenticação usando o serviço
    if (!AuthService.checkAuthentication()) {
        console.log("Autenticação falhou - redirecionando para login");
        return; // O serviço já redireciona para login
    }

    console.log("Autenticação bem sucedida - carregando perfil");

    // Inicialização do modelo
    $scope.userProfile = {
        _id: AuthService.getUserId(),
        name: '',
        email: '',
        image: null,
        teams: [],
        friends: [],
        extra: {}
    };

    $scope.userStatus = {
        total_points: 0,
        pointCategories: {},
        level: { level: 'Nível 1' }
    };

    $scope.passwordData = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    };

    $scope.isProcessing = false;
    $scope.uploadProgress = 0;

    // Carregar dados do perfil
    $scope.loadUserProfile = function() {
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
                console.log('Perfil do usuário carregado:', response.data);
                $scope.userProfile = response.data;

                // Se não houver imagem, usar uma padrão
                if (!$scope.userProfile.image || !$scope.userProfile.image.medium || !$scope.userProfile.image.medium.url) {
                    $scope.userProfile.image = {
                        small: { url: 'public/img/default-avatar.png' },
                        medium: { url: 'public/img/default-avatar.png' },
                        original: { url: 'public/img/default-avatar.png' }
                    };
                }
            },
            function(error) {
                console.error('Falha ao carregar perfil do usuário:', error);
                alert('Não foi possível carregar seu perfil. Por favor, tente novamente mais tarde.');
            }
        );
    };

    // Carregar dados de status do usuário (pontos, nível, etc)
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
                console.log('Status do usuário carregado:', response.data);
                $scope.userStatus = response.data;

                // Garantir que pointCategories exista
                if (!$scope.userStatus.pointCategories) {
                    $scope.userStatus.pointCategories = { moaicoins: 0, moaimoney: 0 };
                }

                // Garantir que level exista
                if (!$scope.userStatus.level) {
                    $scope.userStatus.level = { level: 'Nível 1' };
                }
            },
            function(error) {
                console.error('Falha ao carregar status do usuário:', error);
            }
        );
    };

    // Abre o seletor de arquivo quando o botão de editar foto é clicado
    $scope.openFileSelector = function() {
        document.getElementById('profile-photo-input').click();
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

            var reader = new FileReader();

            reader.onload = function(e) {
                // Atualizar temporariamente a foto exibida
                $scope.$apply(function() {
                    $scope.userProfile.image.medium.url = e.target.result;
                });

                // Aqui seria onde você enviaria a imagem para um servidor de armazenamento
                // e então usaria a URL recebida na API da Funifier
                // Por enquanto, apenas simulamos o upload bem-sucedido
                alert('Funcionalidade de upload de foto será implementada em uma atualização futura.');
            };

            reader.readAsDataURL(file);
        }
    };

    // Função para alterar a senha usando a API específica da Funifier para alteração de senha
    $scope.changePassword = function() {
        // Validar que as senhas coincidem
        if ($scope.passwordData.newPassword !== $scope.passwordData.confirmPassword) {
            alert('As senhas não coincidem. Por favor, tente novamente.');
            return;
        }

        // Verificar se a senha atual foi fornecida
        if (!$scope.passwordData.currentPassword) {
            alert('Por favor, insira sua senha atual.');
            return;
        }

        // Verificar se a senha nova é forte o suficiente
        if ($scope.passwordData.newPassword.length < 6) {
            alert('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        $scope.isProcessing = true;

        // Montar a URL com os parâmetros de consulta
        var userId = AuthService.getUserId();
        var url = API_CONFIG.baseUrl + '/player/password?player=' + userId +
                  '&old_password=' + encodeURIComponent($scope.passwordData.currentPassword) +
                  '&new_password=' + encodeURIComponent($scope.passwordData.newPassword);

        var req = {
            method: 'PUT',
            url: url,
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        $http(req).then(
            function(response) {
                console.log('Senha alterada com sucesso:', response);
                $scope.isProcessing = false;

                // Limpar formulário
                $scope.passwordData = {
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                };

                alert('Sua senha foi alterada com sucesso!');
            },
            function(error) {
                console.error('Falha ao alterar senha:', error);
                $scope.isProcessing = false;

                // Melhorar a mensagem de erro com informações mais específicas
                var errorMessage = 'Não foi possível alterar sua senha.';

                if (error.status === 401 || error.status === 403) {
                    errorMessage = 'Senha atual incorreta. Por favor, verifique e tente novamente.';
                } else if (error.status === 400) {
                    errorMessage = 'Os dados fornecidos são inválidos.';
                    if (error.data && error.data.message) {
                        errorMessage += ' ' + error.data.message;
                    }
                } else if (error.status === 404) {
                    errorMessage = 'Usuário não encontrado. Por favor, faça login novamente.';
                } else {
                    errorMessage += ' Por favor, tente novamente mais tarde.';
                    if (error.data && error.data.message) {
                        errorMessage += ' ' + error.data.message;
                    }
                }

                alert(errorMessage);
            }
        );
    };

    // Função para logout
    $scope.logout = function() {
        if (confirm('Tem certeza que deseja sair?')) {
            AuthService.logout();
            // O serviço AuthService já redireciona para a página de login
        }
    };

    // Função de diagnóstico da comunicação com a API
    $scope.debugApiCommunication = function() {
        // Esta função é apenas para desenvolvimento e diagnóstico
        console.log('=== DEBUG: Iniciando teste de comunicação com API ===');

        var userId = AuthService.getUserId();

        // Teste 1: Verificar se podemos obter o perfil do usuário
        var req1 = {
            method: 'GET',
            url: API_CONFIG.baseUrl + '/player/' + userId,
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            }
        };

        console.log('Teste 1: Enviando requisição GET para obter perfil');
        console.log(req1);

        $http(req1).then(
            function(response) {
                console.log('Teste 1: Sucesso! Perfil recebido:', response.data);

                // Teste 2: Tentar uma atualização mínima (apenas o nome)
                var profile = response.data;
                var originalName = profile.name;
                var testName = originalName + ' (teste)';

                profile.name = testName;

                var req2 = {
                    method: 'POST',
                    url: API_CONFIG.baseUrl + '/player',
                    headers: {
                        "Authorization": API_CONFIG.authHeader,
                        "Content-Type": "application/json"
                    },
                    data: profile
                };

                console.log('Teste 2: Enviando requisição POST para atualizar nome');
                console.log(req2);

                $http(req2).then(
                    function(updateResponse) {
                        console.log('Teste 2: Sucesso! Perfil atualizado:', updateResponse.data);

                        // Restaurar nome original
                        profile.name = originalName;

                        var req3 = {
                            method: 'POST',
                            url: API_CONFIG.baseUrl + '/player',
                            headers: {
                                "Authorization": API_CONFIG.authHeader,
                                "Content-Type": "application/json"
                            },
                            data: profile
                        };

                        console.log('Teste 3: Restaurando nome original');

                        $http(req3).then(
                            function() {
                                console.log('Teste 3: Nome restaurado com sucesso');
                                console.log('=== DEBUG: Todos os testes concluídos com sucesso! ===');
                                console.log('A API está funcionando corretamente. Problema deve estar na lógica de negócios.');
                            },
                            function(error) {
                                console.error('Teste 3: Falha ao restaurar nome:', error);
                                console.log('=== DEBUG: Falha nos testes! ===');
                            }
                        );
                    },
                    function(error) {
                        console.error('Teste 2: Falha ao atualizar perfil:', error);
                        console.log('=== DEBUG: Falha nos testes! ===');
                        console.log('Problema identificado: Não é possível atualizar o perfil.');
                    }
                );
            },
            function(error) {
                console.error('Teste 1: Falha ao obter perfil:', error);
                console.log('=== DEBUG: Falha nos testes! ===');
                console.log('Problema identificado: Não é possível obter o perfil do usuário.');
            }
        );
    };

    // Adicione esta função ao controller
    $scope.navigate = function(path) {
        console.log("Navegando para:", path);
        $location.path(path);
    };

    // Carregar dados ao inicializar o controller
    $scope.loadUserProfile();
    $scope.loadUserStatus();
});
