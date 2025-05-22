// Angular app configuration
var angular = angular; // Declare the angular variable
var app = angular.module('moaiApp', ['ngRoute']);

// Configure routes
app.config(function($routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'views/login/login.html',  // Update this path
            controller: 'LoginController'
        })
        .when('/dashboard', {
            templateUrl: 'views/dashboard/dashboard.html',  // Update this path
            controller: 'DashboardController'
        })
        .when('/rewards', {
            templateUrl: 'views/rewards/rewards.html',  // Update this path
            controller: 'RewardsController'
        })
        .when('/islands', {
            templateUrl: 'views/islands/islands.html',  // Update this path
            controller: 'IslandsController',
            auth: true
        })
        .when('/challenges', {
            templateUrl: 'views/dashboard/dashboard.html',  // Placeholder, will be implemented later
            controller: 'DashboardController'
        })
        .when('/profile', {
            templateUrl: 'views/profile/profile.html',  // Update to use the new profile page
            controller: 'ProfileController'
        })
        .when('/development', {
            templateUrl: 'views/development/development.html',
            controller: 'DevelopmentController'
        })
        .otherwise({
            redirectTo: '/'
        });
});

// API configuration
app.constant('API_CONFIG', {
    baseUrl: 'https://service2.funifier.com/v3',
    apiKey: '6825e0322327f74f3a3d1f84',
    authHeader: 'Basic NjgyNWUwMzIyMzI3Zjc0ZjNhM2QxZjg0OjY4Mjg5NGE2MjMyN2Y3NGYzYTNkZDM1Mw=='
});
