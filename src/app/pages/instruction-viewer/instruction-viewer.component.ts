import {ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {AsyncPipe} from "@angular/common";
import {
  AmbientLight, AxesHelper, Box3Helper,
  BufferGeometry, Clock, Color, DirectionalLight,
  Group, Material, OrthographicCamera, PerspectiveCamera, Scene, Spherical,
  Vector3, WebGLRenderer
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {InstructionModel, InstructionPart, InstructionSubmodel, StepModel, StepPart} from "../../model/instructions";
import {InstructionService} from "../../services/file/instruction.service";
import {LdrPart} from "../../model/ldrawParts";
import {ActivatedRoute} from "@angular/router";
import {MocGrabberService} from "../../services/grabber/moc-grabber.service";
import {Box3} from "three/src/math/Box3.js";
import {InstructionPartComponent} from "../../components/instruction-part/instruction-part.component";

@Component({
  selector: 'app-instruction-viewer',
  standalone: true,
  templateUrl: './instruction-viewer.component.html',
  imports: [
    InstructionPartComponent
  ],
  styleUrl: './instruction-viewer.component.sass'
})
export class InstructionViewerComponent implements OnInit, OnDestroy {

  mocName: string = "";
  mocVersion: string = "";
  mocFileName: string = "";
  loadingFinished: boolean = true;
  loadingText: string = "Loading...";
  renderingActive: boolean = false
  currentStepNumber: number = 0;

  private isMouseDown: boolean = false;
  private integratedScroll: number = 0; //TODO remove x
  private integratedCursor: { mx: number, my: number }[] = []; //TODO remove x and y

  currentStepModel: StepModel;
  instructionModel: InstructionModel;

  private scene: Scene = new Scene();
  private camera: OrthographicCamera | undefined;
  private cameraCoordinates: Spherical = new Spherical();
  private target: Vector3 = new Vector3(0,0,0);

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowRight":
        this.nextStep();
        break;
      case "ArrowLeft":
        this.previousStep();
        break;
    }
  }

  @HostListener('document:mousedown', ['$event'])
  handleMouseDownEvent(event: MouseEvent) {
    //TODO check the button (left, right)
    this.isMouseDown = true;
  }

  @HostListener('document:mouseup', ['$event'])
  handleMouseUpEvent(event: MouseEvent) {
    //TODO check the button (left, right)
    this.isMouseDown = false;
  }

  @HostListener('document:mousemove', ['$event'])
  handleMouseMoveEvent(event: MouseEvent) {
    if(this.isMouseDown)
      this.integratedCursor.push({ mx: event.movementX, my: event.movementY });
  }

  @HostListener('document:wheel', ['$event'])
  handleWheelEvent(event: WheelEvent) {
    this.integratedScroll += event.deltaY;
  }

  readonly clock = new Clock();
  // 60 fps
  readonly MAX_FPS: number = 1 / 60;

  constructor(private instructionService: InstructionService, private route: ActivatedRoute, private mocGrabberService: MocGrabberService) {
    this.currentStepModel = {stepPartsList: [], newPartsModel: new Group(), prevPartsModel: new Group()};
    this.instructionModel = {
      instructionSteps: [],
      parts: new Map<string, InstructionPart>(),
      submodels: new Map<string, InstructionSubmodel>(),
      ldrData: {
        colorToPrevMaterialMap: new Map<number, Material>(),
        nameToLineGeometryMap: new Map<string, BufferGeometry>(),
        colorToMaterialMap: new Map<number, Material>(),
        nameToColorGeometryMap: new Map<string, Map<number, BufferGeometry>>(),
        nameToGeometryMap: new Map<string, BufferGeometry>(),
        allPartsMap: new Map<string, LdrPart>()
      }
    };
  }

  async ngOnInit() {
    this.route.paramMap.subscribe(async paramMap => {
      const moc = this.mocGrabberService.getMoc(Number(paramMap.get('id')) || 0);
      const version = moc?.versions.find(v => v.version.toLowerCase() === paramMap.get('version'));
      const file = version?.files[Number(paramMap.get('file')) || 0];
      if (file) {
        this.mocName = moc?.title ?? "";
        this.mocFileName = file.name;
        this.mocVersion = version.version;
        this.loadingFinished = false;
        const defaultLink = "https://bricksafe.com/files/SkySaac/temp/test2.io";
        this.instructionModel = await this.instructionService.getInstructionModel(defaultLink);
        //this.instructionModel = await this.instructionService.getInstructionModel(file.link);
        this.createScene();
        this.refreshStep(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.renderingActive = false;
  }

  previousStep() {
    if (this.currentStepNumber === 0) return;
    this.currentStepNumber -= 1;
    this.refreshStep(true);
  }

  nextStep() {
    if (this.currentStepNumber === this.instructionModel.instructionSteps.length - 1) return;
    this.currentStepNumber += 1;
    this.refreshStep(true);
  }

  private updateControls():void{
    //add up cursor movement
    let deltaX: number = 0;
    let deltaY: number = 0;
    for(let i = 0; i < this.integratedCursor.length; i++){
      deltaX += this.integratedCursor[i].mx;
      deltaY += this.integratedCursor[i].my;
    }
    this.integratedCursor = [];

    //add up scroll
    const scrollSpeed = 0.001;
    console.log(this.cameraCoordinates.radius);
    this.cameraCoordinates.radius += this.integratedScroll * scrollSpeed;
    this.integratedScroll = 0;

    const rotationSpeed = 0.005;
    this.cameraCoordinates.theta -= deltaX * rotationSpeed;
    this.cameraCoordinates.phi -= deltaY * rotationSpeed;

    // no camera flipping
    this.cameraCoordinates.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraCoordinates.phi));

    const newPosition = new Vector3().setFromSpherical(this.cameraCoordinates).add(this.target);
    this.camera?.position.copy(newPosition);
    this.camera?.lookAt(this.target);
    //console.log(this.camera?.position);
  }

  private refreshStep(removeOldModels: boolean): void {
    if (removeOldModels)
      this.scene.remove(this.currentStepModel.newPartsModel, this.currentStepModel.prevPartsModel);

    this.currentStepModel = this.instructionService.getModelByStep(this.instructionModel, this.currentStepNumber);

    new Box3().setFromObject(this.currentStepModel.newPartsModel).getCenter(this.currentStepModel.prevPartsModel.position).multiplyScalar(-1);
    new Box3().setFromObject(this.currentStepModel.newPartsModel).getCenter(this.currentStepModel.newPartsModel.position).multiplyScalar(-1);

    /*if (this.camera) {
      const boundingBox = new Box3().setFromObject(this.currentStepModel.newPartsModel);
      const p1 = new Vector3(boundingBox.min.x, boundingBox.min.y, boundingBox.min.z).project(this.camera);
      const p2 = new Vector3(boundingBox.min.x, boundingBox.min.y, boundingBox.max.z).project(this.camera);
      const p3 = new Vector3(boundingBox.min.x, boundingBox.max.y, boundingBox.min.z).project(this.camera);
      const p4 = new Vector3(boundingBox.min.x, boundingBox.max.y, boundingBox.max.z).project(this.camera);

      const p5 = new Vector3(boundingBox.max.x, boundingBox.min.y, boundingBox.min.z).project(this.camera);
      const p6 = new Vector3(boundingBox.max.x, boundingBox.min.y, boundingBox.max.z).project(this.camera);
      const p7 = new Vector3(boundingBox.max.x, boundingBox.max.y, boundingBox.min.z).project(this.camera);
      const p8 = new Vector3(boundingBox.max.x, boundingBox.max.y, boundingBox.max.z).project(this.camera);
      //TODO adjust camera
    }*/

    //this.scene.add(new Box3Helper(new Box3().setFromObject(this.currentStepModel.newPartsModel), new Color(0xffff00))); //yellow
    //this.scene.add(new Box3Helper(new Box3().setFromObject(this.currentStepModel.prevPartsModel), new Color(0x00ff00)));

    this.scene.add(this.currentStepModel.newPartsModel, this.currentStepModel.prevPartsModel);

    //TODO update stepPart UI
  }

  createScene(): void {
    const newScene = new Scene();
    this.scene = newScene;

    const pointLight = new DirectionalLight(0xffffff, 0.5);
    pointLight.position.set(100, 100, -100);
    newScene.add(pointLight);
    const pointLight2 = new DirectionalLight(0xffffff, 0.5);
    pointLight2.position.set(-100, -100, 100);
    newScene.add(pointLight2);
    const ambientLight = new AmbientLight(0xffffff, 0.8);
    newScene.add(ambientLight);

    //TODO remove
    //const axesHelper = new AxesHelper();
    //newScene.add(axesHelper);

    const canvas = document.getElementById('canvas-viewer');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    if (!canvas || !canvasWrapper) return;
    let canvasSizes = {
      width: canvas.clientWidth,
      height: canvas.clientHeight
    };

    const camera = new OrthographicCamera(canvasSizes.width / -2, canvasSizes.width / 2, canvasSizes.height / 2, canvasSizes.height / -2, 1, 1000);
    camera.position.z = 5;
    camera.position.y = 5;
    camera.position.x = 5;
    camera.lookAt(0,0,0);
    newScene.add(camera);
    this.camera = camera;

    const renderer = new WebGLRenderer({antialias: true, canvas: canvas});
    renderer.setSize(canvasSizes.width, canvasSizes.height);
    renderer.setPixelRatio(window.devicePixelRatio * 1.5);
    renderer.setClearColor("rgb(88,101,117)");

    window.addEventListener('resize', () => {
      renderer.setSize(canvasWrapper.clientWidth, canvasWrapper.clientHeight);
      renderer.render(newScene, camera);

      camera.left = canvasWrapper.clientWidth / -2;
      camera.right = canvasWrapper.clientWidth / 2;
      camera.top = canvasWrapper.clientHeight / 2;
      camera.bottom = canvasWrapper.clientHeight / -2;
      camera.updateProjectionMatrix();
    });

    const update = () => {
      if (this.clock.getElapsedTime() > this.MAX_FPS) {
        this.updateControls();

        //TODO only render if mouse moved or next step clicked or so
        renderer.render(newScene, camera);

        this.clock.start()
      }
      // Call tick again on the next frame
      if (this.renderingActive)
        window.requestAnimationFrame(update);
    };

    this.updateControls();
    renderer.render(newScene, camera);

    this.loadingFinished = true;
    this.renderingActive = true;

    update();
  }
}
