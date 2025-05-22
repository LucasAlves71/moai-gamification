angular.module('moaiApp').service('AuthService', function($location, $rootScope) {
    // Verificar se o usuário está logado
    this.checkAuthentication = function() {
        var userId = localStorage.getItem('userId');
        var accessToken = localStorage.getItem('accessToken');

        console.log('AuthService: Verificando autenticação', {
            userId: userId ? "existente" : "ausente",
            token: accessToken ? "existente" : "ausente"
        });

        if (!userId || !accessToken) {
            console.log('AuthService: Usuário não autenticado. Redirecionando para login...');
            $location.path('/');
            return false;
        }

        console.log('AuthService: Usuário autenticado.');
        return true;
    };

    // Manter autenticação consistente entre controllers
    this.getUserId = function() {
        return localStorage.getItem('userId');
    };

    this.getAccessToken = function() {
        return localStorage.getItem('accessToken');
    };

    this.logout = function() {
        localStorage.removeItem('userId');
        localStorage.removeItem('accessToken');
        $location.path('/');
    };

    // Verificar autenticação quando há mudança de rota
    $rootScope.$on('$routeChangeStart', function(event, next, current) {
        console.log('Mudança de rota detectada para: ', next.$$route ? next.$$route.originalPath : 'desconhecido');

        // Não verificar autenticação para a rota de login
        if (next.$$route && next.$$route.originalPath === '/') {
            console.log('Rota de login - ignorando verificação de autenticação');
            return;
        }
    });
});
