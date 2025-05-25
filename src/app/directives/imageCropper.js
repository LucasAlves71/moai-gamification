angular.module('moaiApp').directive('imageCropper', function() {
    return {
        restrict: 'E',
        scope: {
            imageSource: '=',
            onCropComplete: '&',
            onCancel: '&'
        },
        template: `
            <div class="image-cropper-container">
                <div class="cropper-area">
                    <img id="image-to-crop" ng-src="{{imageSource}}" alt="Imagem para recortar">
                </div>

                <!-- Mobile controls for cropper -->
                <div class="cropper-mobile-controls">
                    <div class="control-row">
                        <button class="btn btn-sm btn-light" ng-click="zoomIn()">
                            <i class="bi bi-zoom-in"></i>
                        </button>
                        <button class="btn btn-sm btn-light" ng-click="zoomOut()">
                            <i class="bi bi-zoom-out"></i>
                        </button>
                        <button class="btn btn-sm btn-light" ng-click="rotateLeft()">
                            <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                        <button class="btn btn-sm btn-light" ng-click="rotateRight()">
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                    </div>
                </div>

                <div class="cropper-controls mt-3">
                    <button class="btn btn-moai" ng-click="cropImage()" ng-disabled="isProcessing">
                        <span ng-if="!isProcessing">Salvar Imagem</span>
                        <span ng-if="isProcessing">
                            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                            Processando...
                        </span>
                    </button>
                    <button class="btn btn-secondary ms-2" ng-click="cancel()" ng-disabled="isProcessing">Cancelar</button>
                </div>
            </div>
        `,
        link: function(scope, element, attrs) {
            var cropper;

            // Inicializar o cropper quando a imagem estiver carregada
            var img = element.find('img')[0];
            img.onload = function() {
                if (cropper) {
                    cropper.destroy();
                }

                cropper = new Cropper(img, {
                    aspectRatio: 1,
                    viewMode: 1,
                    responsive: true,
                    zoomable: true,
                    rotatable: true,
                    scalable: true,
                    movable: true,
                    minContainerWidth: 250,
                    minContainerHeight: 250,
                    minCropBoxWidth: 100,
                    minCropBoxHeight: 100,
                    guides: true,
                    center: true,
                    highlight: true,
                    autoCropArea: 0.8, // Make the crop area larger by default
                    dragMode: 'move'
                });

                // Fix initial size for mobile
                setTimeout(function() {
                    if (window.innerWidth < 576) {
                        cropper.resize();
                    }
                }, 200);
            };

            // Mobile control methods
            scope.zoomIn = function() {
                if (cropper) cropper.zoom(0.1);
            };

            scope.zoomOut = function() {
                if (cropper) cropper.zoom(-0.1);
            };

            scope.rotateLeft = function() {
                if (cropper) cropper.rotate(-45);
            };

            scope.rotateRight = function() {
                if (cropper) cropper.rotate(45);
            };

            // Method to handle window resize
            var handleResize = function() {
                if (cropper) {
                    cropper.resize();
                }
            };

            // Add window resize listener
            window.addEventListener('resize', handleResize);

            // Método para recortar a imagem
            scope.cropImage = function() {
                if (!cropper) return;

                scope.isProcessing = true;

                // Get device pixel ratio to improve quality on high-density screens
                var pixelRatio = window.devicePixelRatio || 1;

                // Calculate optimal dimensions based on device
                var maxDimension = window.innerWidth < 576 ? 200 : 260;

                // Obter canvas com a imagem recortada
                var canvas = cropper.getCroppedCanvas({
                    width: maxDimension * pixelRatio,
                    height: maxDimension * pixelRatio,
                    imageSmoothingEnabled: true,
                    imageSmoothingQuality: 'high'
                });

                if (canvas) {
                    // Converter para data URL - use a higher quality for better results
                    var dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                    scope.onCropComplete({imageDataUrl: dataUrl});
                } else {
                    console.error('Erro ao recortar imagem');
                    scope.isProcessing = false;
                }
            };

            // Método para cancelar
            scope.cancel = function() {
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }
                scope.onCancel();
            };

            // Limpar ao destruir o escopo
            scope.$on('$destroy', function() {
                window.removeEventListener('resize', handleResize);
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }
            });
        }
    };
});
