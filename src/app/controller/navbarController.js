// Controlador AngularJS melhorado para a navbar
angular.module('moaiApp').controller('NavbarController', ['$scope', '$location', function($scope, $location) {

    // Função para navegar entre rotas
    $scope.navigate = function(route) {
        $location.path(route);

        // Adicionar feedback visual
        const navItems = document.querySelectorAll('.nav-item-moai');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === '#' + route) {
                item.classList.add('active');
            }
        });

        // Log para debug
        console.log('Navegando para:', route);
    };

    // Função para verificar se a rota está ativa
    $scope.isActive = function(route) {
        return $location.path() === route;
    };

    // Observar mudanças de rota
    $scope.$on('$locationChangeSuccess', function() {
        // Atualizar estado ativo da navbar quando a rota mudar
        updateActiveState();
    });

    // Função para atualizar o estado ativo
    function updateActiveState() {
        const currentPath = $location.path();
        const navItems = document.querySelectorAll('.nav-item-moai');

        navItems.forEach(item => {
            const href = item.getAttribute('href');
            const route = href ? href.replace('#', '') : '';

            if (route === currentPath) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Inicializar estado ativo quando o controller carregar
    $scope.$on('$viewContentLoaded', function() {
        setTimeout(updateActiveState, 100);
    });

    // Função para adicionar badges de notificação (opcional)
    $scope.addNotificationBadge = function(route, count) {
        const navItem = document.querySelector(`[href="#${route}"]`);
        if (navItem && count > 0) {
            let badge = navItem.querySelector('.notification-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notification-badge';
                navItem.querySelector('.nav-icon-moai').appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ff4757;
                color: white;
                border-radius: 10px;
                padding: 2px 6px;
                font-size: 8px;
                font-weight: bold;
                min-width: 16px;
                text-align: center;
            `;
        }
    };

    // Função para remover badges de notificação
    $scope.removeNotificationBadge = function(route) {
        const navItem = document.querySelector(`[href="#${route}"]`);
        if (navItem) {
            const badge = navItem.querySelector('.notification-badge');
            if (badge) {
                badge.remove();
            }
        }
    };

}]);
