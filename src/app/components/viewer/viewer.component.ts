import {Component, Input, OnInit} from '@angular/core';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {IoFileService} from 'src/app/services/file/io-file.service';
import {AmbientLight, Box3, Clock, Group, PerspectiveCamera, PointLight, Scene, Vector3, WebGLRenderer} from 'three';
import {CommonModule} from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.sass']
})
export class ViewerComponent implements OnInit {

  @Input('placeHolderColor')
  placeHolderColor: string = "";

  @Input('inputLink')
  inputLink: string = "https://bricksafe.com/files/SkySaac/website/110/usa/stoke/v2.1/v2.1.io";

  @Input('showViewer')
  showViewer: boolean = false;

  //determines if the loading icon will be shown
  loadingFinished: boolean = true;

  loadingText = this.ioFileService.loadingState;

  private readonly clock = new Clock();
  // 30 fps
  private readonly INTERNAL: number = 1 / 60;

  constructor(private ioFileService: IoFileService) {
  }

  ngOnInit(): void {
    if (this.showViewer)
      this.showViewerMoc();
  }

  async showViewerMoc() {
    this.loadingFinished = false;
    let group: Group = await this.ioFileService.getModel(this.inputLink, this.placeHolderColor);
    group.rotateOnWorldAxis(new Vector3(0, 0, 1), Math.PI);
    this.createThreeJsBox(group);
  }

  createThreeJsBox(mocGroup: Group): void {

    const scene = new Scene();

    const pointLight = new PointLight(0xffffff, 0.3);
    pointLight.position.add(new Vector3(1000, 500, 1000));
    scene.add(pointLight);

    const pointLight2 = new PointLight(0xffffff, 0.3);
    pointLight2.position.add(new Vector3(-1000, 500, -1000));
    scene.add(pointLight2);

    const ambientLight = new AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    scene.add(mocGroup);

    let canvasSizes = {
      width: window.innerWidth / 3,
      height: window.innerWidth * (3 / 12),
    };

    const canvas = document.getElementById('canvas-box');
    const canvasDiv = document.getElementById('canvas-viewer');

    if (!canvas || !canvasDiv) {
      console.error("Error: no canvas found");
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

    const renderer = new WebGLRenderer({antialias: true, canvas: canvas});
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

    let delta = 0;

    const update = () => {
      delta += this.clock.getDelta();
      if (delta > this.INTERNAL) {
        controls.update();
        // Render
        renderer.render(scene, camera);

        delta = delta % this.INTERNAL;
      }
      // Call tick again on the next frame
      if (this.showViewer)
        window.requestAnimationFrame(update);
    };

    controls.update();
    renderer.render(scene, camera);

    this.loadingFinished = true;

    update();
  }

}
