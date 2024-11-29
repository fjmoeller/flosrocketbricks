import {ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {AsyncPipe} from "@angular/common";
import {
  AmbientLight, AxesHelper, Box3Helper,
  BufferGeometry, Clock, Color, DirectionalLight,
  Group, Material, Matrix3, Matrix4, OrthographicCamera, PerspectiveCamera, Quaternion, Scene, Spherical,
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
  canvasSize: { width: number, height: number } = {width: 0, height: 0};

  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private scrollDelta: number = 0;
  private dragDelta: { mx: number, my: number }[] = [];
  private panDelta: { mx: number, my: number }[] = [];

  currentStepModel: StepModel;
  instructionModel: InstructionModel;

  private scene: Scene = new Scene();
  private camera: OrthographicCamera = new OrthographicCamera();
  private cameraCoordinates: Spherical = new Spherical(1, 1, 1);
  private target: Vector3 = new Vector3(0, 0, 0);

  readonly clock = new Clock();
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
      if (file) { //TODO add && instructions
        this.mocName = moc?.title ?? "";
        this.mocFileName = file.name;
        this.mocVersion = version.version;
        this.loadingFinished = false;
        const defaultLink = "https://bricksafe.com/files/SkySaac/temp/test2.io";
        this.instructionModel = await this.instructionService.getInstructionModel(defaultLink);
        //this.instructionModel = await this.instructionService.getInstructionModel(file.link); //TODO
        this.createScene();
        this.refreshStep(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.renderingActive = false;
  }

  private registerListeners(canvas: HTMLElement) {
    canvas.addEventListener('mousedown', event => {
      if (event.button === 0)
        this.isDragging = true;
      else if (event.button === 2)
        this.isPanning = true;
    });
    canvas.addEventListener('mouseup', event => {
      if (event.button === 0)
        this.isDragging = false;
      else if (event.button === 2)
        this.isPanning = false;
    });
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.scrollDelta += event.deltaY;
    });
    canvas.addEventListener('mousemove', event => {
      if (this.isDragging)
        this.dragDelta.push({mx: event.movementX, my: event.movementY});
      if (this.isPanning)
        this.panDelta.push({mx: event.movementX, my: event.movementY});
    });
    canvas.addEventListener('keydown', event => {
      switch (event.key) {
        case "ArrowRight":
          this.nextStep();
          break;
        case "ArrowLeft":
          this.previousStep();
          break;
      }
    });
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

  private updateControls(): void {
    //zooming in
    const zoomSpeed = 0.02; //TODO put in settings & make depending on current zoom
    this.camera.zoom = Math.max(Math.min(this.camera.zoom - (this.scrollDelta * zoomSpeed), 1000), 5);
    this.scrollDelta = 0;


    //panning
    const panSpeed = 1 / this.camera.zoom; //TODO put in settings
    let panningDeltaX: number = 0;
    let panningDeltaY: number = 0;
    for (let i = 0; i < this.panDelta.length; i++) {
      panningDeltaX -= this.panDelta[i].mx;
      panningDeltaY += this.panDelta[i].my;
    }
    this.panDelta = [];
    this.target.add(new Vector3(panningDeltaX * panSpeed, panningDeltaY * panSpeed, 0).applyMatrix3(new Matrix3().getNormalMatrix(this.camera.matrix)))

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
    this.camera?.position.setFromSpherical(this.cameraCoordinates).add(this.target);
    this.camera?.lookAt(this.target);

    this.camera.updateProjectionMatrix();
  }

  private refreshStep(removeOldModels: boolean): void {
    if (removeOldModels)
      this.scene.remove(this.currentStepModel.newPartsModel, this.currentStepModel.prevPartsModel);

    this.currentStepModel = this.instructionService.getModelByStep(this.instructionModel, this.currentStepNumber);

    new Box3().setFromObject(this.currentStepModel.newPartsModel).getCenter(this.currentStepModel.prevPartsModel.position).multiplyScalar(-1);
    new Box3().setFromObject(this.currentStepModel.newPartsModel).getCenter(this.currentStepModel.newPartsModel.position).multiplyScalar(-1);

    if (this.camera) { // zoom to the correct distance
      const box = new Box3().setFromObject(this.currentStepModel.newPartsModel);
      box.applyMatrix4(this.camera.matrixWorld);
      const width = box.max.x - box.min.x;
      const height = box.max.y - box.min.y;
      const defaultZoomFactor = 4; //TODO put in settings
      if (width / height > this.canvasSize.width / this.canvasSize.height)
        this.camera.zoom = this.canvasSize.width / (width * defaultZoomFactor);
      else
        this.camera.zoom = this.canvasSize.height / (height * defaultZoomFactor);
    }

    //this.scene.add(new Box3Helper(new Box3().setFromObject(this.currentStepModel.newPartsModel), new Color(0xffff00))); //yellow
    //this.scene.add(new Box3Helper(new Box3().setFromObject(this.currentStepModel.prevPartsModel), new Color(0x00ff00)));

    this.scene.add(this.currentStepModel.newPartsModel, this.currentStepModel.prevPartsModel);
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

    const canvas = document.getElementById('canvas-viewer');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    if (!canvas || !canvasWrapper) return;
    this.canvasSize = {
      width: canvas.clientWidth,
      height: canvas.clientHeight
    };
    this.registerListeners(canvas);

    const camera = new OrthographicCamera(this.canvasSize.width / -2, this.canvasSize.width / 2, this.canvasSize.height / 2, this.canvasSize.height / -2, -1000, 1000);
    camera.zoom = 10;
    camera.lookAt(0, 0, 0);
    newScene.add(camera);
    this.camera = camera;

    const renderer = new WebGLRenderer({antialias: true, canvas: canvas});
    renderer.setSize(this.canvasSize.width, this.canvasSize.height);
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
