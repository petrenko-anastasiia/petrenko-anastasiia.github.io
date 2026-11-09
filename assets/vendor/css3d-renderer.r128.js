/*
 * CSS3DRenderer for three.js r128 (global build).
 * Port of examples/js/renderers/CSS3DRenderer.js, trimmed to what the showroom
 * needs: CSS3DObject + a renderer that keeps DOM elements in sync with a
 * PerspectiveCamera so they can share one camera with a WebGLRenderer.
 */
(function () {
  'use strict';
  if (!window.THREE) return;
  var THREE = window.THREE;

  // r128's Object3D is an ES class, so build a real Object3D and decorate it
  // (calling Object3D as a function throws). Used with "new" like the original.
  function CSS3DObject(element) {
    var object = new THREE.Object3D();
    object.isCSS3DObject = true;
    object.element = element || document.createElement('div');
    object.element.style.position = 'absolute';
    object.element.style.pointerEvents = 'auto';
    object.addEventListener('removed', function () {
      object.traverse(function (child) {
        if (child.element instanceof Element && child.element.parentNode !== null) {
          child.element.parentNode.removeChild(child.element);
        }
      });
    });
    return object;
  }

  function epsilon(value) {
    return Math.abs(value) < 1e-10 ? 0 : value;
  }

  function getCameraCSSMatrix(matrix) {
    var e = matrix.elements;
    return 'matrix3d(' +
      epsilon(e[0]) + ',' + epsilon(-e[1]) + ',' + epsilon(e[2]) + ',' + epsilon(e[3]) + ',' +
      epsilon(e[4]) + ',' + epsilon(-e[5]) + ',' + epsilon(e[6]) + ',' + epsilon(e[7]) + ',' +
      epsilon(e[8]) + ',' + epsilon(-e[9]) + ',' + epsilon(e[10]) + ',' + epsilon(e[11]) + ',' +
      epsilon(e[12]) + ',' + epsilon(-e[13]) + ',' + epsilon(e[14]) + ',' + epsilon(e[15]) + ')';
  }

  function getObjectCSSMatrix(matrix) {
    var e = matrix.elements;
    return 'translate(-50%,-50%)matrix3d(' +
      epsilon(e[0]) + ',' + epsilon(e[1]) + ',' + epsilon(e[2]) + ',' + epsilon(e[3]) + ',' +
      epsilon(-e[4]) + ',' + epsilon(-e[5]) + ',' + epsilon(-e[6]) + ',' + epsilon(-e[7]) + ',' +
      epsilon(e[8]) + ',' + epsilon(e[9]) + ',' + epsilon(e[10]) + ',' + epsilon(e[11]) + ',' +
      epsilon(e[12]) + ',' + epsilon(e[13]) + ',' + epsilon(e[14]) + ',' + epsilon(e[15]) + ')';
  }

  function CSS3DRenderer() {
    var width = 0, height = 0, widthHalf = 0, heightHalf = 0;
    var cache = { camera: { fov: 0, style: '' }, objects: new WeakMap() };

    var domElement = document.createElement('div');
    domElement.style.overflow = 'hidden';
    this.domElement = domElement;

    var cameraElement = document.createElement('div');
    cameraElement.style.transformStyle = 'preserve-3d';
    cameraElement.style.pointerEvents = 'none';
    domElement.appendChild(cameraElement);

    this.getSize = function () { return { width: width, height: height }; };

    this.setSize = function (w, h) {
      width = w; height = h;
      widthHalf = w / 2; heightHalf = h / 2;
      domElement.style.width = w + 'px';
      domElement.style.height = h + 'px';
      cameraElement.style.width = w + 'px';
      cameraElement.style.height = h + 'px';
    };

    function renderObject(object, scene, camera, cameraCSSMatrix) {
      if (object.isCSS3DObject) {
        var visible = object.visible;
        object.element.style.display = visible ? '' : 'none';
        if (visible) {
          var style = getObjectCSSMatrix(object.matrixWorld);
          var cached = cache.objects.get(object);
          if (cached === undefined || cached.style !== style) {
            object.element.style.transform = style;
            cache.objects.set(object, { style: style });
          }
          if (object.element.parentNode !== cameraElement) {
            cameraElement.appendChild(object.element);
          }
        }
      }
      for (var i = 0, l = object.children.length; i < l; i++) {
        renderObject(object.children[i], scene, camera, cameraCSSMatrix);
      }
    }

    this.render = function (scene, camera) {
      var fov = camera.projectionMatrix.elements[5] * heightHalf;
      if (cache.camera.fov !== fov) {
        domElement.style.perspective = camera.isPerspectiveCamera ? fov + 'px' : '';
        cache.camera.fov = fov;
      }
      if (scene.autoUpdate === true) scene.updateMatrixWorld();
      if (camera.parent === null) camera.updateMatrixWorld();

      var cameraCSSMatrix = 'translateZ(' + fov + 'px)' + getCameraCSSMatrix(camera.matrixWorldInverse);
      var style = cameraCSSMatrix + 'translate(' + widthHalf + 'px,' + heightHalf + 'px)';
      if (cache.camera.style !== style) {
        cameraElement.style.transform = style;
        cache.camera.style = style;
      }
      renderObject(scene, scene, camera, cameraCSSMatrix);
    };
  }

  THREE.CSS3DObject = CSS3DObject;
  THREE.CSS3DRenderer = CSS3DRenderer;
})();
