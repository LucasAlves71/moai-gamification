angular.module('moaiApp').controller('LoginController', function($scope, $http, $location, API_CONFIG) {
    // Initialize user object
    $scope.user = {
        email: '',
        password: ''
    };

    // Login function
    $scope.login = function() {
        // Create request configuration
        var req = {
            method: 'POST',
            url: API_CONFIG.baseUrl + '/auth/token',
            headers: {
                "Authorization": API_CONFIG.authHeader,
                "Content-Type": "application/json"
            },
            data: {
                "apiKey": API_CONFIG.apiKey,
                "grant_type": "password",
                "username": $scope.user.email, // Using email as username
                "password": $scope.user.password
            }
        };

        // Make API request
        $http(req).then(
            function(response) {
                console.log('Login successful:', response.data);

                // Store user data in localStorage
                localStorage.setItem('userId', $scope.user.email);
                localStorage.setItem('accessToken', response.data.access_token);

                // Após login bem-sucedido, verificar se é necessário onboarding
                checkOnboardingStatus($scope.user.email);
            },
            function(error) {
                console.error('Login failed:', error);
                alert('Login failed. Please check your credentials and try again.');
            }
        );
    };

    // Adicionar essa nova função ao controller:
    function checkOnboardingStatus(userId) {
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
                console.log('Player data loaded:', response.data);

                // Verificar se o jogador precisa de onboarding
                var needsOnboarding = false;

                if (response.data.extra && response.data.extra.onboarding === true) {
                    needsOnboarding = true;
                }

                // Direcionar para a página apropriada
                if (needsOnboarding) {
                    $location.path('/onboarding');
                } else {
                    $location.path('/dashboard');
                }

                // Tentar reproduzir o áudio sem bloquear a navegação
                try {
                    var oceanSound = document.getElementById('ocean-sound');
                    if (oceanSound) {
                        setTimeout(function() {
                            oceanSound.play().catch(function(error) {
                                console.log('Audio could not be played:', error);
                            });
                        }, 0);
                    }
                } catch (e) {
                    console.error('Error trying to play audio:', e);
                }
            },
            function(error) {
                console.error('Failed to load player data:', error);
                // Em caso de falha, direcionar para o dashboard como fallback
                $location.path('/dashboard');
            }
        );
    }
});
