import {AfterViewInit, Component, Input, OnDestroy} from '@angular/core';
import {StepPart} from "../../model/instructions";
import {AmbientLight, Clock, DirectionalLight, Group, OrthographicCamera, Scene, Vector3, WebGLRenderer} from "three";
import {Box3} from "three/src/math/Box3.js";

@Component({
  selector: 'app-instruction-part',
  standalone: true,
  imports: [],
  templateUrl: './instruction-part.component.html',
  styleUrl: './instruction-part.component.sass'
})
export class InstructionPartComponent implements AfterViewInit, OnDestroy {
  @Input()
  stepPart?: StepPart;

  @Input()
  partIndex: number = 0;

  private renderingActive: boolean = false;
  private readonly MAX_FPS: number = 1 / 30;
  private readonly clock = new Clock();

  ngAfterViewInit(): void {
    if (this.stepPart)
      this.createScene(this.stepPart?.model);
  }

  ngOnDestroy(): void {
    this.renderingActive = false;
  }

  private createScene(partGroup: Group) {
    const model = partGroup;
    model.rotateX(Math.PI);

    const newScene = new Scene();
    newScene.add(model);

    const pointLight = new DirectionalLight(0xffffff, 0.5);
    pointLight.position.set(100, 100, -100);
    newScene.add(pointLight);
    const pointLight2 = new DirectionalLight(0xffffff, 0.5);
    pointLight2.position.set(-100, -100, 100);
    newScene.add(pointLight2);
    const ambientLight = new AmbientLight(0xffffff, 0.8);
    newScene.add(ambientLight);
    const canvas = document.getElementById('canvas-part-' + this.partIndex);
    const canvasWrapper = document.getElementById('canvas-wrapper-' + this.partIndex);
    if (!canvas || !canvasWrapper) return;
    let canvasSizes = {
      width: canvas.clientWidth,
      height: canvas.clientHeight
    };

    const camera = new OrthographicCamera(canvasSizes.width / -2, canvasSizes.width / 2, canvasSizes.height / 2, canvasSizes.height / -2, -1000, 1000);
    camera.position.z = 10;
    //camera.position.y = mocBB.getSize(new Vector3).y * 0.8;
    camera.position.y = 10;
    camera.position.x = 10;
    camera.lookAt(0, 0, 0);
    newScene.add(camera);

    //make part as big as possible //TODO fix
    const box = new Box3().setFromObject(model);
    const boxPoints = [
      new Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(camera.matrixWorld),
      new Vector3(box.min.x, box.min.y, box.max.z).applyMatrix4(camera.matrixWorld),
      new Vector3(box.min.x, box.max.y, box.min.z).applyMatrix4(camera.matrixWorld),
      new Vector3(box.min.x, box.max.y, box.max.z).applyMatrix4(camera.matrixWorld),
      new Vector3(box.max.x, box.min.y, box.min.z).applyMatrix4(camera.matrixWorld),
      new Vector3(box.max.x, box.min.y, box.max.z).applyMatrix4(camera.matrixWorld),
      new Vector3(box.max.x, box.max.y, box.min.z).applyMatrix4(camera.matrixWorld),
      new Vector3(box.max.x, box.max.y, box.max.z).applyMatrix4(camera.matrixWorld),
    ];
    const cameraBox = new Box3().setFromPoints(boxPoints);
    const width = cameraBox.max.x - cameraBox.min.x;
    const height = cameraBox.max.y - cameraBox.min.y;
    const defaultZoomFactor = 1;
    if (width / height > canvasSizes.width / canvasSizes.height)
      camera.zoom = canvasSizes.width / (width * defaultZoomFactor);
    else
      camera.zoom = canvasSizes.height / (height * defaultZoomFactor);

    const renderer = new WebGLRenderer({antialias: true, canvas: canvas, alpha: true});
    renderer.setSize(canvasSizes.width, canvasSizes.height);
    renderer.setPixelRatio(window.devicePixelRatio * 1.5);

    const update = () => {
      if (this.clock.getElapsedTime() > this.MAX_FPS) {

        //TODO only render if mouse moved or next step
        renderer.render(newScene, camera);

        this.clock.start()
      }
      // Call tick again on the next frame
      if (this.renderingActive)
        window.requestAnimationFrame(update);
    };

    renderer.render(newScene, camera);

    this.renderingActive = true;

    update();
  }
}
