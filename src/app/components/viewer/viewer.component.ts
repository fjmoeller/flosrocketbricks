import { Component, Input } from '@angular/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IoFileService } from 'src/app/services/io-file.service';
import { AmbientLight, BasicShadowMap, Box3, BoxHelper, Group, PerspectiveCamera, PointLight, Scene, Vector3, WebGLRenderer } from 'three';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.sass']
})
export class ViewerComponent {

  @Input() inputLink: string = "https://bricksafe.com/files/SkySaac/website/110/usa/stoke/v2.1/v2.1.ldr";

  _showViewer: boolean = false;
  @Input()
  set showViewer(showViewer: boolean) {
    this._showViewer = showViewer;
    if (showViewer)
      this.showViewerMoc();
  }
  get showViewer() { return this._showViewer; }

  constructor(private ioFileService: IoFileService) { }

  async showViewerMoc() {
    let group: Group = await this.ioFileService.getModel(this.inputLink);
    group.rotateOnWorldAxis(new Vector3(0, 0, 1), Math.PI);
    this.createThreeJsBox(group);
  }

  createThreeJsBox(mocGroup: Group): void {

    const canvas = document.getElementById('canvas-box');
    const canvasDiv = document.getElementById('canvas-viewer');
    const scene = new Scene();

    const pointLight = new PointLight(0xffffff, 0.2);
    pointLight.position.add(new Vector3(1000, 500, 1000));
    pointLight.castShadow = true;
    scene.add(pointLight);

    const pointLight2 = new PointLight(0xffffff, 0.2);
    pointLight2.position.add(new Vector3(-1000, 500, -1000));
    pointLight2.castShadow = true;
    scene.add(pointLight2);

    const ambientLight = new AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    mocGroup.castShadow = true;
    mocGroup.receiveShadow = true;

    scene.add(mocGroup);

    let canvasSizes= {
      width: window.innerWidth / 3,
        height: window.innerWidth * (3 / 12),
    };
    if (canvasDiv)
      canvasSizes = {
        width: canvasDiv.clientWidth,
        height: canvasDiv.clientWidth * (3 / 4)
      };

    const camera = new PerspectiveCamera(
      50,
      canvasSizes.width / canvasSizes.height,
      0.1,
      10000
    );

    if (!canvas || !canvasDiv) {
      return;
    }

    console.log("Canvs: " + canvasSizes.width + "," + canvasSizes.height)

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = BasicShadowMap;

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
      if (this._showViewer)
        window.requestAnimationFrame(animateGeometry);
    };
    controls.update();
    renderer.render(scene, camera);

    animateGeometry();
  }

}
