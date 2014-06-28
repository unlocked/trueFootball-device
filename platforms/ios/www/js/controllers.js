var map;

angular.module('starter.controllers', ['yaMap'])
    .controller('AppCtrl', function ($scope) {
        $scope.afterMapInit = function (_map) {
            map = _map;
        };
    })
    .value('sharedData', { eventToOpen: null })
    .controller('MapController', function (
            $scope, $http, $timeout,
            $ionicPopup,
            templateLayoutFactory,
            Config, Sports, DataService,
            sharedData
        ) {
        var uid;
        DataService.get('uid').then(function (data) {
            uid = data;
        });
        $scope.geoObjects = [];

        $http.get(Config.apiUrl + '/events').success(function (data) {
            angular.forEach(data, function (event) {
                $scope.geoObjects.push({
                    geometry: {
                        type: "Point",
                        coordinates: [Number(event.x), Number(event.y)]
                    },
                    properties: {
                        iconContent: Sports[event.sport - 1].title,
                        hintContent: '',
                        event: event
                    }
                });
            });
        });

        $scope.maybeOpen = function(geoObject) {
            if (!sharedData.eventToOpen) return;

            if (geoObject.properties.get('event').id == sharedData.eventToOpen) {
                sharedData.eventToOpen = null;
                $timeout(function () {
                    geoObject.balloon.open();
                });
            }
        };

        $scope.overrides = {
            build: function () {
                // Сначала вызываем метод build родительского класса.
                var BalloonContentLayout = templateLayoutFactory.get('templateOne');
                BalloonContentLayout.superclass.build.call(this);
//                А затем выполняем дополнительные действия.
                angular.element(document.getElementById('joinButton')).bind('click', this.joinEventClick);
            },

            // Аналогично переопределяем функцию clear, чтобы снять
            // прослушивание клика при удалении макета с карты.
            clear: function () {
                // Выполняем действия в обратном порядке - сначала снимаем слушателя,
                // а потом вызываем метод clear родительского класса.
                angular.element(document.getElementById('counter-button')).unbind('click', this.onCounterClick);
                var BalloonContentLayout = templateLayoutFactory.get('templateOne');
                BalloonContentLayout.superclass.clear.call(this);
            },

            joinEventClick: function () {
                var request = {
                    uid: uid,
                    eventId: document.getElementById('joinButton').getAttribute('data-event-id')
                };

                /**
                 * POST http://backend.api/join
                 */
                $http.post(Config.apiUrl + '/events/join', request)
                    .success(function (event) {
                        if (document.getElementById('joinButton').getAttribute('data-event-id') == event.id)
                            document.getElementById('eventCapacity').innerHTML = event.count + '/' + event.capacity;
                    })
                    .error(function (message) {
                        $ionicPopup.alert({
                            title: 'Не удалось присоединиться к событию',
                            template: message
                        });
                    });
            }
        };
    })

    .controller('EventsController', function (
            $scope, $location, $http,
            $ionicPopup, $ionicLoading,
            Sports, Config, DataService,
            sharedData
        ) {
        $scope.sports = Sports;

        $scope.event = {};

        $scope.addEvent = function (event) {
            event.position = { x: 0, y: 0 };
            event.start = event.date + ' ' + event.time;

            $http.get('http://geocode-maps.yandex.ru/1.x/?format=json&results=1&geocode=Россия,Санкт-Петербург,' + event.address)
                .success(function (geoAddress) {
                    var point = geoAddress.response.GeoObjectCollection.featureMember[0].GeoObject.Point;
                    var pos = point.pos.split(' ');
                    event.position = { x: Number(pos[0]), y: Number(pos[1]) };
                    /*geoObjects.push({
                        geometry: {
                            type: "Point",
                            coordinates: [event.y, event.x]
                        },
                        properties: {
                            iconContent: event.sport.title,
                            hintContent: event.description
                        }
                    });*/

                    var _uid;
                    DataService.get('uid').then(function (data) {
                        _uid = data;
                    });
                    var data = {event: event, uid: _uid};
                    $ionicLoading.show({
                        template: 'Пожалуйста, подождите...'
                    });

                    $http.post(Config.apiUrl + '/events', data)
                        .success(function (newEvent) {
                            sharedData.eventToOpen = newEvent.id;
                            $location.path('/app/map');
                        })
                        .error(function (message) {
                            $ionicPopup.alert({
                                title: 'Не удалось добавить событие',
                                template: message
                            });
                        })
                        .finally($ionicLoading.hide);
                })
                .error(function(message) {
                    $ionicPopup.alert({
                        title: 'Ошибка при поиске адреса',
                        template: message
                    });
                });
        }
    });