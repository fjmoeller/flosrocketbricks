import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {StepPart} from "../../model/instructions";
import {AmbientLight, Clock, DirectionalLight, Group, OrthographicCamera, Scene, Vector3, WebGLRenderer} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";

@Component({
  selector: 'app-instruction-part',
  standalone: true,
  imports: [],
  templateUrl: './instruction-part.component.html',
  styleUrl: './instruction-part.component.sass'
})
export class InstructionPartComponent implements OnInit, OnDestroy {
  @Input()
  stepPart?: StepPart;

  @Input()
  partIndex: number = 0;

  private renderingActive: boolean = false;
  private readonly MAX_FPS: number = 1 / 30;
  private readonly clock = new Clock();

  ngOnInit(): void {
    if (this.stepPart)
      this.createScene(this.stepPart?.model);
  }

  ngOnDestroy(): void {
    this.renderingActive = false;
  }

  private createScene(partGroup: Group) {
    const newScene = new Scene();
    newScene.add(partGroup);

    const pointLight = new DirectionalLight(0xffffff, 0.5);
    pointLight.position.set(100, 100, -100);
    newScene.add(pointLight);
    const pointLight2 = new DirectionalLight(0xffffff, 0.5);
    pointLight2.position.set(-100, -100, 100);
    newScene.add(pointLight2);
    const ambientLight = new AmbientLight(0xffffff, 0.8);
    newScene.add(ambientLight);

    const canvas = document.getElementById('canvas-wrapper-' + this.partIndex);
    const canvasWrapper = document.getElementById('canvas-wrapper-' + this.partIndex);
    if (!canvas || !canvasWrapper) return;
    let canvasSizes = {
      width: canvas.clientWidth,
      height: canvas.clientHeight
    };

    const camera = new OrthographicCamera(canvasSizes.width / -2, canvasSizes.width / 2, canvasSizes.height / 2, canvasSizes.height / -2, 1, 1000);
    //TODO what should the initial position be
    camera.position.z = 10;
    //camera.position.y = mocBB.getSize(new Vector3).y * 0.8;
    camera.position.y = 10;
    camera.position.x = 10;
    newScene.add(camera);

    const renderer = new WebGLRenderer({antialias: true, canvas: canvas});
    renderer.setSize(canvasSizes.width, canvasSizes.height);
    renderer.setPixelRatio(window.devicePixelRatio * 1.5);
    //renderer.setClearColor("rgb(88,101,117)"); //TODO: brauchen wir das?

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target = new Vector3(0, 0, 0);
    controls.maxDistance = 500;
    controls.minDistance = 5;

    const update = () => {
      if (this.clock.getElapsedTime() > this.MAX_FPS) {
        controls.update();

        //TODO only render if mouse moved or next step
        renderer.render(newScene, camera);

        this.clock.start()
      }
      // Call tick again on the next frame
      if (this.renderingActive)
        window.requestAnimationFrame(update);
    };

    controls.update();
    renderer.render(newScene, camera);

    this.renderingActive = true;

    update();
  }
}
