import { Component } from '@angular/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IoFileService } from 'src/app/services/io-file.service';
import { AmbientLight, AxesHelper, Box3, BoxGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, PointLight, Scene, Vector3, WebGLRenderer } from 'three';

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
    //rotate 
    let group: Group = await this.ioFileService.createMeshes2(ldrFile);
    group.rotateOnWorldAxis(new Vector3(0, 0, 1), Math.PI);
    this.createThreeJsBox(group);
  }

  async testIoExtracted() {
    let group: Group = await this.ioFileService.getModel(this.inputLink);
    this.createThreeJsBox(group);
  }

  createThreeJsBox(mocGroup: Group): void {

    const canvas = document.getElementById('canvas-box');
    const scene = new Scene();

    //TODO remove
    const axesHelper = new AxesHelper(5);
    scene.add(axesHelper);

    const pointLight = new PointLight(0xffffff, 0.8);
    pointLight.position.add(new Vector3(1000,500,1000));
    scene.add(pointLight);

    var boxMesh = new Mesh(new BoxGeometry(10, 10,10), new MeshBasicMaterial({ color: 0xff0000}));
    boxMesh.position.add(new Vector3(1000,500,1000));
    scene.add(boxMesh);

    const ambientLight = new AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const canvasSizes = {
      width: window.innerWidth / 2,
      height: window.innerHeight / 2,
    };
    const camera = new PerspectiveCamera(
      75,
      canvasSizes.width / canvasSizes.height,
      0.001,
      100000
    );
    camera.position.z = 50;
    scene.add(camera);

    scene.add(mocGroup);

    var geo = new PlaneGeometry(2000, 2000, 8, 8);
    var mat = new MeshBasicMaterial({ color: 0x050505, side: DoubleSide });
    var plane = new Mesh(geo, mat);
    scene.add(plane);
    plane.rotateX(- Math.PI / 2);


    const mocBoundingBox = new Box3();
    mocBoundingBox.setFromObject(mocGroup);

    if (!canvas) {
      return;
    }

    const renderer = new WebGLRenderer({
      canvas: canvas,
    });
    renderer.setClearColor(0x19212D, 1);
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

    //TODO improve
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
