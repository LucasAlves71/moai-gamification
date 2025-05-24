angular.module('moaiApp').controller('LoginController', function($scope, $http, $location, API_CONFIG) {
    // Adicionar classe login-page ao body
    angular.element(document.body).addClass('login-page');

    // Remover a classe quando sair da página
    $scope.$on('$destroy', function() {
        angular.element(document.body).removeClass('login-page');
    });

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

    // Add this function to your LoginController
    $scope.playOceanSound = function($event) {
        try {
            var oceanSound = document.getElementById('ocean-sound');
            if (oceanSound) {
                // Reset the audio to the beginning if it was already played
                oceanSound.currentTime = 0;

                // Make sure audio can play in the background by setting loop to false
                // and storing a reference to keep it alive during navigation
                oceanSound.loop = false;

                // Store the current time so we can track how long it should play
                var startTime = new Date().getTime();

                // Store audio element in localStorage to prevent garbage collection
                window.oceanSoundPlaying = true;

                // Play the sound
                var playPromise = oceanSound.play();

                if (playPromise !== undefined) {
                    playPromise.then(function() {
                        // Successfully started playing
                        console.log('Ocean sound started playing');

                        // Store in sessionStorage that sound is playing
                        sessionStorage.setItem('oceanSoundPlaying', 'true');
                        sessionStorage.setItem('oceanSoundStartTime', startTime);

                    }).catch(function(error) {
                        console.log('Audio could not be played:', error);
                    });
                }
            }
        } catch (e) {
            console.error('Error trying to play audio:', e);
        }
    };

    // Check if we need to continue playing a sound from previous page
    (function checkPreviousAudio() {
        try {
            if (sessionStorage.getItem('oceanSoundPlaying') === 'true') {
                var startTime = parseInt(sessionStorage.getItem('oceanSoundStartTime') || '0');
                var currentTime = new Date().getTime();
                var elapsedTime = (currentTime - startTime) / 1000; // Convert to seconds

                // If the sound has been playing for less than its duration
                // (assuming the ocean wave sound is around 5 seconds)
                if (elapsedTime < 5) {
                    var oceanSound = document.getElementById('ocean-sound');
                    if (oceanSound) {
                        // Set the current time to match how long it's been playing
                        oceanSound.currentTime = elapsedTime;
                        oceanSound.play().catch(function(error) {
                            console.log('Could not continue playing audio:', error);
                        });
                    }
                }

                // Clear the session storage
                sessionStorage.removeItem('oceanSoundPlaying');
                sessionStorage.removeItem('oceanSoundStartTime');
            }
        } catch (e) {
            console.error('Error checking previous audio state:', e);
        }
    })();
});
