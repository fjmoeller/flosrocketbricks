import { Component, Input, OnInit } from '@angular/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LdrToThreeService } from 'src/app/services/file/ldr-to-three.service';
import { AmbientLight, BasicShadowMap, Box3, Clock, DirectionalLight, Group, Mesh, MeshLambertMaterial, PerspectiveCamera, PlaneGeometry, Scene, Vector3, WebGLRenderer } from 'three';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

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

  @Input('viewerVersion')
  viewerVersion: string = "V1";

  private dataCTSubject = new BehaviorSubject<number>(0);
  computingTime: Observable<number> = this.dataCTSubject.asObservable();

  //determines if the loading icon will be shown
  loadingFinished: boolean = true;

  loadingText = this.ioFileService.loadingState;

  public ENABLE_SHADOWS: boolean = false;

  private readonly clock = new Clock();
  // 60 fps
  private readonly INTERNAL: number = 1 / 60;

  constructor(private ioFileService: LdrToThreeService) {
  }

  ngOnInit(): void {
    if (this.showViewer)
      this.showViewerMoc();
  }

  async showViewerMoc() {
    this.loadingFinished = false;
    const group: Group = await this.ioFileService.getModel(this.inputLink, this.placeHolderColor,this.viewerVersion);
    this.createScene(group);
  }

  createScene(mocGroup: Group): void {

    const scene = new Scene();

    mocGroup.rotateOnWorldAxis(new Vector3(0, 0, 1), Math.PI);
    const mocBB = new Box3().setFromObject(mocGroup);
    mocGroup.position.y += mocBB.getSize(new Vector3()).y / 2;
    scene.add(mocGroup);

    const ambientLight = new AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const lights = [
      [1, 1, 1],
      [-1, 1, 1],
      [1, 1, -1],
      [-1, 1, -1],
    ];
    for (const [x, y, z] of lights) {
      const dirLight = new DirectionalLight(0xffffff, 0.3);
      dirLight.position.set(x, y, z).normalize();
      if (this.ENABLE_SHADOWS)
        dirLight.castShadow = true;
      scene.add(dirLight);
    }

    const planeGeometry = new PlaneGeometry(200, 200, 50, 50);
    const planeMaterial = new MeshLambertMaterial({ color: 0x999999 });
    const plane = new Mesh(planeGeometry, planeMaterial);
    plane.rotateX(-Math.PI / 2);
    if (this.ENABLE_SHADOWS)
      plane.receiveShadow = true;
    scene.add(plane);

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

    const camera = new PerspectiveCamera(50, canvasSizes.width / canvasSizes.height, 0.5, 1000);
    camera.position.z = -100;
    camera.position.y = mocBB.getSize(new Vector3).y * 0.8;
    camera.position.x = -50;
    scene.add(camera);

    const renderer = new WebGLRenderer({ antialias: true, canvas: canvas });
    renderer.setClearColor(0x19212D, 1);
    if (this.ENABLE_SHADOWS) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = BasicShadowMap;
    }
    renderer.setSize(canvasSizes.width, canvasSizes.height);
    renderer.setPixelRatio(window.devicePixelRatio * 1.5);
    renderer.setClearColor("rgb(88,101,117)");

    window.addEventListener('resize', () => {
      canvasSizes.width = canvasDiv.clientWidth;
      canvasSizes.height = canvasDiv.clientWidth * (3 / 4);

      camera.aspect = canvasSizes.width / canvasSizes.height;
      camera.updateProjectionMatrix();

      renderer.setSize(canvasSizes.width, canvasSizes.height);
      renderer.render(scene, camera);
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target = new Vector3(0, mocBB.getSize(new Vector3).y / 2, 0);
    controls.maxDistance = 500;
    controls.minDistance = 5;

    const update = () => {
      this.dataCTSubject.next(this.clock.getElapsedTime()); //TODO only when debug mode enabled
      if (this.clock.getElapsedTime() > this.INTERNAL) {
        controls.update();
        // Render
        renderer.render(scene, camera);

        this.clock.start()
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
