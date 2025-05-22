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

                // Redirect to dashboard - este é o ponto chave!
                $location.path('/dashboard');

                // Tente reproduzir o áudio sem bloquear a navegação
                try {
                    var oceanSound = document.getElementById('ocean-sound');
                    if (oceanSound) {
                        // Desvincula a reprodução do áudio da navegação
                        setTimeout(function() {
                            oceanSound.play().catch(function(error) {
                                console.log('Audio could not be played:', error);
                            });
                        }, 0);
                    }
                } catch (e) {
                    console.error('Error trying to play audio:', e);
                    // Continue mesmo com erro de áudio
                }
            },
            function(error) {
                console.error('Login failed:', error);
                alert('Login failed. Please check your credentials and try again.');
            }
        );
    };
});
