import { Component } from '@angular/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IoFileService } from 'src/app/services/io-file.service';
import { AmbientLight, AxesHelper, BasicShadowMap, Box3, BoxGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, PointLight, Scene, Vector3, WebGLRenderer } from 'three';

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
    group.rotateOnWorldAxis(new Vector3(0, 0, 1), Math.PI);
    this.createThreeJsBox(group);
  }

  createThreeJsBox(mocGroup: Group): void {

    const canvas = document.getElementById('canvas-box');
    const scene = new Scene();

    //TODO remove
    const axesHelper = new AxesHelper(5);
    scene.add(axesHelper);

    const pointLight = new PointLight(0xffffff, 0.2);
    pointLight.position.add(new Vector3(1000,500,1000));
    pointLight.castShadow=true;
    scene.add(pointLight);

    const pointLight2 = new PointLight(0xffffff, 0.2);
    pointLight2.position.add(new Vector3(-1000,500,-1000));
    pointLight2.castShadow=true;
    scene.add(pointLight2);

    const ambientLight = new AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    mocGroup.castShadow=true;
    mocGroup.receiveShadow = true;
    const mocBoundingBox = new Box3();
    mocBoundingBox.setFromObject(mocGroup);
    scene.add(mocGroup);

    const canvasSizes = {
      width: window.innerWidth / 2,
      height: window.innerHeight / 2,
    };
    const camera = new PerspectiveCamera(
      75,
      canvasSizes.width / canvasSizes.height,
      0.1,
      10000
    );

    scene.add(camera);

    camera.position.x = (mocBoundingBox.max.x + mocBoundingBox.min.x) / 2;
    camera.position.y = (mocBoundingBox.max.y + mocBoundingBox.min.y) / 2;
    camera.position.z = (mocBoundingBox.max.z + mocBoundingBox.min.z) / 2;
    //camera.translateZ(camera.position.z+200);
    if (!canvas) {
      return;
    }

    const renderer = new WebGLRenderer({ antialias: true, canvas:canvas});
    renderer.setClearColor(0x19212D, 1);
    renderer.setSize(canvasSizes.width, canvasSizes.height);
    renderer.setPixelRatio( window.devicePixelRatio * 1.5 );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = BasicShadowMap;

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
