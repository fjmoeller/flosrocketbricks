import {AfterViewInit, Component, Inject, Input, OnDestroy, OnInit, PLATFORM_ID} from '@angular/core';
import {StepPart} from "../../model/instructions";
import {
  AmbientLight,
  Clock,
  DirectionalLight,
  Group, Matrix4,
  OrthographicCamera,
  Scene,
  Spherical,
  Vector3,
  WebGLRenderer
} from "three";
import {Box3} from "three/src/math/Box3.js";
import {LdrawColorService} from "../../services/color/ldraw-color.service";
import {isPlatformBrowser} from "@angular/common";

@Component({
  selector: 'app-instruction-part',
  standalone: true,
  imports: [],
  templateUrl: './instruction-part.component.html',
  styleUrl: './instruction-part.component.sass'
})
export class InstructionPartComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input()
  isPartList: boolean = false;

  //if this component is a submodelindicator
  @Input()
  submodelAmountIndicator?: number;
  @Input()
  submodelGroup?: Group;

  //if this component is a part list item
  @Input()
  stepPart?: StepPart;
  @Input()
  partIndex: number = -1;

  colorName: string = "";
  partId: string = "";

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

  zoomSpeed = 0.0002;
  rotationSpeed = 0.01;

  constructor(private ldrawColorService: LdrawColorService, @Inject(PLATFORM_ID) private _platformId: Object) {
  }

  ngOnInit(): void {
    if (this.stepPart && this.isPartList) {
      this.colorName = this.ldrawColorService.getLdrawColorNameByColorId(this.stepPart.color).split('_').join(' ');
      if (this.stepPart.partId.endsWith(".dat"))
        this.partId = this.stepPart.partId.slice(0, this.stepPart.partId.length - 4);
      else
        this.partId = this.stepPart.partId;
    }
  }

  ngAfterViewInit() {
    setTimeout(() => { //set timeout cause angular is kinda stupid
      if (isPlatformBrowser(this._platformId)) {
        if (this.stepPart && this.isPartList)
          this.createScene(this.stepPart?.model);
        else if (this.submodelGroup && !this.isPartList)
          this.createScene(this.submodelGroup);
      }
    }, 5);
  }

  ngOnDestroy(): void {
    this.renderingActive = false;
  }

  private updateControls(): void {
    //zooming in
    this.camera.zoom = Math.max(Math.min(this.camera.zoom - (this.scrollDelta * this.zoomSpeed), 1), 0);
    this.scrollDelta = 0;

    //rotating & position
    let draggingDeltaX: number = 0;
    let draggingDeltaY: number = 0;
    for (let i = 0; i < this.dragDelta.length; i++) {
      draggingDeltaX += this.dragDelta[i].mx;
      draggingDeltaY += this.dragDelta[i].my;
    }
    this.dragDelta = [];
    this.cameraCoordinates.theta -= draggingDeltaX * this.rotationSpeed;
    this.cameraCoordinates.phi -= draggingDeltaY * this.rotationSpeed;
    // no camera flipping
    this.cameraCoordinates.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.cameraCoordinates.phi));
    this.camera?.position.setFromSpherical(this.cameraCoordinates);
    this.camera?.lookAt(0, 0, 0);

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
    //partModel.add(new Box3Helper(new Box3().setFromObject(partModel), new Color(0x00ff00)));
    partModel.scale.setScalar(0.044);
    partModel.rotateX(Math.PI);
    partModel.rotateY(-Math.PI / 2);
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
    camera.position.setFromSpherical(this.cameraCoordinates);
    camera.lookAt(0, 0, 0);
    partScene.add(camera);
    this.updateControls();

    //fit zoom to part size
    const modelBB = new Box3().setFromObject(partModel);
    modelBB.applyMatrix4(new Matrix4().makeRotationFromEuler(camera.rotation).invert());
    const center = new Vector3();
    modelBB.getCenter(center);
    const leftBottom = modelBB.min.sub(center);
    const rightTop = modelBB.max.sub(center);
    const aspectRatio = (leftBottom.y - rightTop.y) / (leftBottom.x - rightTop.x);
    if (aspectRatio < 1.0) {
      camera.left = leftBottom.x;
      camera.right = rightTop.x;
      camera.bottom = leftBottom.x;
      camera.top = rightTop.x;
    } else {
      camera.left = leftBottom.y;
      camera.right = rightTop.y;
      camera.bottom = leftBottom.y;
      camera.top = rightTop.y;
    }
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
