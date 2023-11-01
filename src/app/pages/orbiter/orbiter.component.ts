import { Component, OnInit } from '@angular/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera';
import { AmbientLight } from 'three/src/lights/AmbientLight';
import { PointLight } from 'three/src/lights/PointLight';
import { Box3 } from 'three/src/math/Box3';
import { Vector3 } from 'three/src/math/Vector3';
import { Group } from 'three/src/objects/Group';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer';
import { Scene } from 'three/src/scenes/Scene';

@Component({
  selector: 'app-orbiter',
  templateUrl: './orbiter.component.html',
  styleUrls: ['./orbiter.component.sass']
})
export class OrbiterComponent implements OnInit {

  //determines if the loading icon will be shown
  loadingFinished: boolean = true;

  constructor() { }

  ngOnInit(): void {
  }

  loadModel() {
    this.loadingFinished = false;
    let group: Group = new Group();
    this.createScene(group);
  }

  addLights(scene: Scene) {
    const pointLight = new PointLight(0xffffff, 0.3);
    pointLight.position.add(new Vector3(1000, 500, 1000));
    scene.add(pointLight);

    const pointLight2 = new PointLight(0xffffff, 0.3);
    pointLight2.position.add(new Vector3(-1000, 500, -1000));
    scene.add(pointLight2);

    const ambientLight = new AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
  }

  createScene(mocGroup: Group): void {

    const scene = new Scene();

    this.addLights(scene);

    scene.add(mocGroup);

    let canvasSizes = {
      width: window.innerWidth / 3,
      height: window.innerWidth * (3 / 12),
    };

    const canvas = document.getElementById('canvas-box');
    const canvasDiv = document.getElementById('canvas-viewer');

    if (!canvas || !canvasDiv){
      console.log("Error: no canvas found");
      return;
    }

    if (canvasDiv)
      canvasSizes = {
        width: canvasDiv.clientWidth,
        height: canvasDiv.clientWidth * (3 / 4)
      };

    const camera = new PerspectiveCamera(50, canvasSizes.width / canvasSizes.height, 0.5, 5000);
    const mocBoundingBox = new Box3();
    mocBoundingBox.setFromObject(mocGroup);
    camera.position.x = (mocBoundingBox.max.x + mocBoundingBox.min.x) / 2
    camera.position.y = (mocBoundingBox.max.y + mocBoundingBox.min.y) / 2
    camera.position.z = (mocBoundingBox.max.z + mocBoundingBox.min.z) / 2
    camera.translateZ(200);
    camera.lookAt(new Vector3((mocBoundingBox.max.x + mocBoundingBox.min.x) / 2, (mocBoundingBox.max.y + mocBoundingBox.min.y) / 2, (mocBoundingBox.max.z + mocBoundingBox.min.z) / 2));
    scene.add(camera);

    const renderer = new WebGLRenderer({ antialias: true, canvas: canvas });
    renderer.setClearColor(0x19212D, 1);
    renderer.setSize(canvasSizes.width, canvasSizes.height);
    renderer.setPixelRatio(window.devicePixelRatio * 1.5);
    renderer.setClearColor("rgb(88,101,117)");
    /*renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = BasicShadowMap;*/

    window.addEventListener('resize', () => {
      canvasSizes.width = canvasDiv.clientWidth;
      canvasSizes.height = canvasDiv.clientWidth * (3 / 4);

      camera.aspect = canvasSizes.width / canvasSizes.height;
      camera.updateProjectionMatrix();

      renderer.setSize(canvasSizes.width, canvasSizes.height);
      renderer.render(scene, camera);
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target = new Vector3((mocBoundingBox.max.x + mocBoundingBox.min.x) / 2, (mocBoundingBox.max.y + mocBoundingBox.min.y) / 2, (mocBoundingBox.max.z + mocBoundingBox.min.z) / 2);

    const animateGeometry = () => {
      controls.update();
      // Render
      renderer.render(scene, camera);
      // Call tick again on the next frame
      window.requestAnimationFrame(animateGeometry);
    };

    controls.update();
    renderer.render(scene, camera);

    this.loadingFinished = true;

    animateGeometry();
  }

}
