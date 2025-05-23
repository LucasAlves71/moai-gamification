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
                    movable: true
                });
            };

            // Método para recortar a imagem
            scope.cropImage = function() {
                if (!cropper) return;

                scope.isProcessing = true;

                // Obter canvas com a imagem recortada
                var canvas = cropper.getCroppedCanvas({
                    width: 260,
                    height: 260
                });

                if (canvas) {
                    // Converter para data URL
                    var dataUrl = canvas.toDataURL('image/jpeg', 0.9);
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
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }
            });
        }
    };
});
