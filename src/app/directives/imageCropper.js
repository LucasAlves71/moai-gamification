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

                <!-- Mobile controls for cropper - improved for touch -->
                <div class="cropper-mobile-controls">
                    <div class="control-row">
                        <button class="btn btn-light" ng-click="zoomIn()" aria-label="Aumentar zoom">
                            <i class="bi bi-zoom-in"></i>
                        </button>
                        <button class="btn btn-light" ng-click="zoomOut()" aria-label="Diminuir zoom">
                            <i class="bi bi-zoom-out"></i>
                        </button>
                        <button class="btn btn-light" ng-click="rotateLeft()" aria-label="Girar para esquerda">
                            <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                        <button class="btn btn-light" ng-click="rotateRight()" aria-label="Girar para direita">
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                    </div>
                    <div class="control-row">
                        <button class="btn btn-light" ng-click="moveUp()" aria-label="Mover para cima">
                            <i class="bi bi-arrow-up"></i>
                        </button>
                        <button class="btn btn-light" ng-click="moveDown()" aria-label="Mover para baixo">
                            <i class="bi bi-arrow-down"></i>
                        </button>
                        <button class="btn btn-light" ng-click="moveLeft()" aria-label="Mover para esquerda">
                            <i class="bi bi-arrow-left"></i>
                        </button>
                        <button class="btn btn-light" ng-click="moveRight()" aria-label="Mover para direita">
                            <i class="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>

                <div class="cropper-controls">
                    <button class="btn btn-moai" ng-click="cropImage()" ng-disabled="isProcessing">
                        <span ng-if="!isProcessing">Salvar Imagem</span>
                        <span ng-if="isProcessing">
                            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                            Processando...
                        </span>
                    </button>
                    <button class="btn btn-secondary" ng-click="cancel()" ng-disabled="isProcessing">Cancelar</button>
                </div>
            </div>
        `,
        link: function(scope, element, attrs) {
            var cropper;
            scope.isProcessing = false;

            // Initialize cropper when image is loaded
            var img = element.find('img')[0];
            img.onload = function() {
                if (cropper) {
                    cropper.destroy();
                }

                // Detect if we're on mobile
                var isMobile = window.innerWidth < 576;

                // Configure cropper with mobile-friendly settings
                cropper = new Cropper(img, {
                    aspectRatio: 1,
                    viewMode: isMobile ? 1 : 2,
                    responsive: true,
                    zoomable: true,
                    rotatable: true,
                    scalable: true,
                    movable: true,
                    minContainerWidth: isMobile ? 200 : 250,
                    minContainerHeight: isMobile ? 200 : 250,
                    minCropBoxWidth: isMobile ? 80 : 100,
                    minCropBoxHeight: isMobile ? 80 : 100,
                    guides: true,
                    center: true,
                    highlight: true,
                    autoCropArea: isMobile ? 0.9 : 0.8, // Larger crop area on mobile
                    dragMode: 'move',
                    toggleDragModeOnDblclick: false, // Disable toggle on double-click for mobile
                    wheelZoomRatio: 0.05, // Gentler zoom on wheel
                    background: false, // Removes the outer grid
                    modal: true, // Darkens the image outside the crop area
                    checkOrientation: true, // Adjusts orientation based on EXIF data
                    checkCrossOrigin: true,
                    cropBoxMovable: true,
                    cropBoxResizable: true
                });

                // Fix initial size for mobile
                setTimeout(function() {
                    if (isMobile) {
                        cropper.resize();
                        cropper.zoom(0.05); // Initial small zoom to ensure user knows it's interactive
                    }
                }, 300);
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

            // Added move controls for mobile
            scope.moveUp = function() {
                if (cropper) cropper.move(0, -10);
            };

            scope.moveDown = function() {
                if (cropper) cropper.move(0, 10);
            };

            scope.moveLeft = function() {
                if (cropper) cropper.move(-10, 0);
            };

            scope.moveRight = function() {
                if (cropper) cropper.move(10, 0);
            };

            // Method to handle window resize
            var handleResize = function() {
                if (cropper) {
                    cropper.resize();
                }
            };

            // Add window resize listener
            window.addEventListener('resize', handleResize);

            // Method to crop the image
            scope.cropImage = function() {
                if (!cropper) return;

                scope.isProcessing = true;

                // Get device pixel ratio to improve quality on high-density screens
                var pixelRatio = window.devicePixelRatio || 1;

                // Calculate optimal dimensions based on device
                var maxDimension = window.innerWidth < 576 ? 300 : 400;

                // Get cropped canvas with the image
                var canvas = cropper.getCroppedCanvas({
                    width: maxDimension * pixelRatio,
                    height: maxDimension * pixelRatio,
                    imageSmoothingEnabled: true,
                    imageSmoothingQuality: 'high'
                });

                if (canvas) {
                    // Convert to data URL - use a higher quality for better results
                    var dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                    scope.onCropComplete({imageDataUrl: dataUrl});
                } else {
                    console.error('Erro ao recortar imagem');
                    scope.isProcessing = false;
                }
            };

            // Method to cancel
            scope.cancel = function() {
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }
                scope.onCancel();
            };

            // Clean up when scope is destroyed
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
