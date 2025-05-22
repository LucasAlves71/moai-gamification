angular.module('moaiApp').controller('NavbarController', function($scope, $location, AuthService) {
    // Function to check if the given path is active
    $scope.isActive = function(path) {
        return $location.path() === path;
    };

    // Garantir que a navegação só ocorra para usuários autenticados
    $scope.navigate = function(path) {
        console.log("Tentando navegar para:", path);

        // Verificar autenticação antes de navegar
        if (AuthService.checkAuthentication()) {
            $location.path(path);
        } else {
            console.log("Navegação bloqueada - usuário não autenticado");
        }

        // Prevenir comportamento padrão
        return false;
    };
});
