import { Component } from '@angular/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IoFileService } from 'src/app/services/io-file.service';
import { AmbientLight, AxesHelper, Group, PerspectiveCamera, PointLight, Scene, Vector3, WebGLRenderer } from 'three';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.sass']
})
export class ViewerComponent {

  inputLink: string = "https://bricksafe.com/files/SkySaac/website/test/test.io";

  constructor(private ioFileService: IoFileService) { }

  async onFileSelected(event: any) {
    let ldrFile = await this.ioFileService.extractLdrFile(new Response(event.target.files[0]));
    let group: Group = this.ioFileService.createMeshes(ldrFile).rotateOnWorldAxis(new Vector3(0, 0, 1), Math.PI);
    this.createThreeJsBox(group);
  }

  async testIoExtracted() {
    let group: Group = await this.ioFileService.getModel(this.inputLink);
    this.createThreeJsBox(group);
  }


  createThreeJsBox(group: Group): void {

    const canvas = document.getElementById('canvas-box');

    const scene = new Scene();

    const ambientLight = new AmbientLight(0xffffff, 0.5);

    scene.add(ambientLight);

    const axesHelper = new AxesHelper( 5 );
    scene.add( axesHelper );

    const pointLight = new PointLight(0xffffff, 0.5);
    pointLight.position.x = 2;
    pointLight.position.y = 4;
    pointLight.position.z = 2;
    scene.add(pointLight);

    const canvasSizes = {
      width: window.innerWidth / 2,
      height: window.innerHeight / 2,
    };

    const camera = new PerspectiveCamera(
      75,
      canvasSizes.width / canvasSizes.height,
      0.001,
      1000
    );
    camera.position.z = 30;
    scene.add(camera);

    scene.add(group);


    if (!canvas) {
      return;
    }

    const renderer = new WebGLRenderer({
      canvas: canvas,
    });
    renderer.setClearColor(0xe232222, 1);
    renderer.setSize(canvasSizes.width, canvasSizes.height);

    window.addEventListener('resize', () => {
      canvasSizes.width = window.innerWidth / 2;
      canvasSizes.height = window.innerHeight / 2;

      camera.aspect = canvasSizes.width / canvasSizes.height;
      camera.updateProjectionMatrix();

      renderer.setSize(canvasSizes.width, canvasSizes.height);
      renderer.render(scene, camera);
    });

    const controls = new OrbitControls(camera, renderer.domElement);

    controls.update();
    const animateGeometry = () => {

      controls.update();

      // Render
      renderer.render(scene, camera);

      // Call tick again on the next frame
      window.requestAnimationFrame(animateGeometry);
    };
    renderer.render(scene, camera);
    animateGeometry();
  }

}
