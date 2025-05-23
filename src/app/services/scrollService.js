angular.module('moaiApp').factory('ScrollService', function($location, $rootScope, $window) {
    return {
        init: function() {
            // Registrar uma função para escutar mudanças de rota
            $rootScope.$on('$routeChangeSuccess', function() {
                // Rolar para o topo da página
                $window.scrollTo(0, 0);
            });
        }
    };
});
