import {AfterViewInit, Component, Input, OnDestroy} from '@angular/core';
import {StepPart} from "../../model/instructions";
import {
  AmbientLight, Box3Helper,
  Clock, Color,
  DirectionalLight,
  Group, Matrix3, Matrix4,
  OrthographicCamera,
  Scene, Sphere,
  Spherical,
  Vector3,
  WebGLRenderer
} from "three";
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
  private dragDelta: { mx: number, my: number }[] = [];
  private scrollDelta: number = 0;
  private isDragging: boolean = false;
  private renderer?: WebGLRenderer;
  private partScene: Scene = new Scene();
  private camera: OrthographicCamera = new OrthographicCamera();
  private cameraCoordinates: Spherical = new Spherical(1, 1, 1);

  ngAfterViewInit(): void {
    if (this.stepPart)
      this.createScene(this.stepPart?.model);
  }

  ngOnDestroy(): void {
    this.renderingActive = false;
  }

  private updateControls(): void {
    //zooming in
    const zoomSpeed = 0.02; //TODO put in settings & make depending on current zoom
    this.camera.zoom = Math.max(Math.min(this.camera.zoom - (this.scrollDelta * zoomSpeed), 1000), 5);
    this.scrollDelta = 0;

    //rotating & position
    const rotationSpeed = 0.01; //TODO put in settings
    let draggingDeltaX: number = 0;
    let draggingDeltaY: number = 0;
    for (let i = 0; i < this.dragDelta.length; i++) {
      draggingDeltaX += this.dragDelta[i].mx;
      draggingDeltaY += this.dragDelta[i].my;
    }
    this.dragDelta = [];
    this.cameraCoordinates.theta -= draggingDeltaX * rotationSpeed;
    this.cameraCoordinates.phi -= draggingDeltaY * rotationSpeed;
    // no camera flipping
    this.cameraCoordinates.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.cameraCoordinates.phi));
    this.camera?.position.setFromSpherical(this.cameraCoordinates);
    this.camera?.lookAt(0, 0, 0);

    console.log("camera.zoom", this.camera.zoom); //TODO remove

    this.camera.updateProjectionMatrix();
  }

  private registerListeners(canvas: HTMLElement) {
    canvas.addEventListener('mousedown', event => {
      if (event.button === 0)
        this.isDragging = true;
    });
    canvas.addEventListener('mouseup', event => {
      if (event.button === 0)
        this.isDragging = false;
    });
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.scrollDelta += event.deltaY;
    });
    canvas.addEventListener('mousemove', event => {
      if (this.isDragging)
        this.dragDelta.push({mx: event.movementX, my: event.movementY});
    });
    canvas.addEventListener('mouseleave', event => {
      this.renderingActive = false;
      this.isDragging = false;
    });
    canvas.addEventListener('mouseenter', event => {
      this.renderingActive = true;
      this.update();
    });
  }

  private createScene(partGroup: Group) {
    const partModel = partGroup.clone();
    partModel.add(new Box3Helper(new Box3().setFromObject(partModel), new Color(0x00ff00)));
    partModel.scale.setScalar(0.044);
    partModel.rotateX(Math.PI);
    partModel.rotateY(Math.PI / 2);
    new Box3().setFromObject(partModel).getCenter(partModel.position).multiplyScalar(-1);

    const partScene = new Scene();
    this.partScene = partScene;
    partScene.add(partModel);

    const pointLight = new DirectionalLight(0xffffff, 0.5);
    pointLight.position.set(100, 100, -100);
    partScene.add(pointLight);
    const pointLight2 = new DirectionalLight(0xffffff, 0.5);
    pointLight2.position.set(-100, -100, 100);
    partScene.add(pointLight2);
    const ambientLight = new AmbientLight(0xffffff, 0.8);
    partScene.add(ambientLight);

    const canvas = document.getElementById('canvas-part-' + this.partIndex);
    const canvasWrapper = document.getElementById('canvas-wrapper-' + this.partIndex);
    if (!canvas || !canvasWrapper) return;
    let canvasSizes = {
      width: canvas.clientWidth,
      height: canvas.clientHeight
    };
    this.registerListeners(canvas);

    const camera = new OrthographicCamera(canvasSizes.width / -2, canvasSizes.width / 2, canvasSizes.height / 2, canvasSizes.height / -2, -1000, 1000);
    this.camera = camera;
    camera.position.z = 5;
    camera.position.y = 5;
    camera.position.x = 5;
    camera.lookAt(0, 0, 0);
    partScene.add(camera);
    this.updateControls();

    //fit zoom to part size
    const modelBB = new Box3().setFromObject(partModel);
    modelBB.applyMatrix4(camera.matrix);
    const modelWidth = modelBB.max.x - modelBB.min.x;
    const modelHeight = modelBB.max.y - modelBB.min.y;
    const defaultZoomFactor = 2; //TODO
    const requiredZoomX = (camera.right - camera.left) / modelWidth;
    const requiredZoomY = (camera.top - camera.bottom) / modelHeight;
    camera.zoom = Math.min(requiredZoomX, requiredZoomY);
    console.log("canvasSizes", canvasSizes);
    console.log("modelWidth", modelWidth);
    console.log("modelMaxX", modelBB.max.x, modelBB.min.x);
    console.log("modelMaxY", modelBB.max.y, modelBB.min.y);
    console.log("modelHeight", modelHeight);
    console.log("requiredZoomX", requiredZoomX);
    console.log("requiredZoomY", requiredZoomY);
    console.log("camera.zoom", camera.zoom);
    camera.updateProjectionMatrix();

    const renderer = new WebGLRenderer({antialias: true, canvas: canvas, alpha: true});
    this.renderer = renderer;
    renderer.setSize(canvasSizes.width, canvasSizes.height);
    renderer.setPixelRatio(window.devicePixelRatio * 1.5);

    this.updateControls();
    this.renderer?.render(this.partScene, this.camera);
  }

  private update = () => {
    if (this.clock.getElapsedTime() > this.MAX_FPS) {
      this.updateControls();
      this.renderer?.render(this.partScene, this.camera);

      this.clock.start()
    }
    // Call tick again on the next frame
    if (this.renderingActive)
      window.requestAnimationFrame(this.update);
  };
}
