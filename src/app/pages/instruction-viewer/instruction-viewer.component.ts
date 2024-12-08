import {Component, OnDestroy, OnInit} from '@angular/core';
import {
  AmbientLight,
  BufferGeometry, Clock, DirectionalLight,
  Group, Material, Matrix3, OrthographicCamera, Scene, Spherical,
  Vector3, WebGLRenderer
} from "three";
import {InstructionModel, InstructionPart, InstructionSubmodel, StepModel} from "../../model/instructions";
import {InstructionService} from "../../services/file/instruction.service";
import {LdrPart} from "../../model/ldrawParts";
import {ActivatedRoute} from "@angular/router";
import {MocGrabberService} from "../../services/grabber/moc-grabber.service";
import {Box3} from "three/src/math/Box3.js";
import {InstructionPartComponent} from "../../components/instruction-part/instruction-part.component";
import {File, Moc, Version} from "../../model/classes";
import {InstructionCoverComponent} from "../../components/instruction-cover/instruction-cover.component";
import {InstructionDownloadComponent} from "../../components/instruction-download/instruction-download.component";

@Component({
  selector: 'app-instruction-viewer',
  standalone: true,
  templateUrl: './instruction-viewer.component.html',
  imports: [
    InstructionPartComponent,
    InstructionCoverComponent,
    InstructionDownloadComponent
  ],
  styleUrl: './instruction-viewer.component.sass'
})
export class InstructionViewerComponent implements OnInit, OnDestroy {

  moc?: Moc;
  file: File;
  version: Version;
  loadingFinished: boolean = true;
  loadingText: string = "Loading...";
  renderingActive: boolean = false;
  currentStepNumber: number = 0;
  currentSubmodelAmount: number = 0;
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
  private cameraCoordinates: Spherical = new Spherical(1, 1, 2.6);
  private target: Vector3 = new Vector3(0, 0, 0);

  readonly clock: Clock = new Clock();
  readonly MAX_FPS: number = 1 / 60;

  zoomSpeed: number = 0.01;
  minimalZoom: number = 7;
  maxCameraZoom: number = 0.05;
  minCameraZoom: number = 1000;
  rotationSpeed: number = 0.01;
  defaultZoomFactor: number = 2;
  panningSpeed: number = 50;
  enableAutoZoom: boolean = true;
  enableAutoRotation: boolean = true;

  constructor(private instructionService: InstructionService, private route: ActivatedRoute, private mocGrabberService: MocGrabberService) {
    this.currentStepModel = {
      stepPartsList: [],
      newPartsModel: new Group(),
      prevPartsModel: new Group(),
      parentSubmodelModel: new Group(),
      parentSubmodelAmount: 0
    };
    this.instructionModel = {
      instructionSteps: [],
      parts: new Map<string, InstructionPart>(),
      submodels: new Map<string, InstructionSubmodel>(),
      ldrData: {
        colorToPrevMaterialMap: new Map<number, Material>(),
        idToLineGeometryMap: new Map<string, BufferGeometry>(),
        colorToMaterialMap: new Map<number, Material>(),
        idToColorGeometryMap: new Map<string, Map<number, BufferGeometry>>(),
        idToGeometryMap: new Map<string, BufferGeometry>(),
        allPartsMap: new Map<string, LdrPart>()
      }
    };
    this.file = {
      link: "",
      instructions: false,
      viewer: false,
      name: "",
      type: "",
      export: false,
      description: ""
    };
    this.version = {
      version: "",
      changelog: "",
      files: [],
      versionExtra: ""
    };
  }

  async ngOnInit() {
    this.route.paramMap.subscribe(async paramMap => {
      const moc = this.mocGrabberService.getMoc(Number(paramMap.get('id')) || 0);
      this.moc = moc;
      const version = moc?.versions.find(v => v.version.toLowerCase() === paramMap.get('version')?.toLowerCase());
      const file = version?.files[Number(paramMap.get('file')) || 0];
      let initialStep = (Number(paramMap.get('stepIndex')) || 0);
      if (file) {
        this.file = file;
        this.version = version;
        this.loadingFinished = false;
        this.instructionModel = await this.instructionService.getInstructionModel(file.link);
        this.createScene();
        this.currentStepNumber = initialStep;
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
    document.addEventListener('keydown', event => {
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
    if (this.currentStepNumber <= 0) return;
    this.currentStepNumber -= 1;
    this.refreshStep(true);
  }

  nextStep() {
    if (this.currentStepNumber >= this.instructionModel.instructionSteps.length + 1) return;
    this.currentStepNumber += 1;
    this.refreshStep(true);
  }

  private updateControls(): void {
    //zooming in
    this.camera.zoom = Math.max(Math.min(this.camera.zoom - (this.scrollDelta * this.zoomSpeed), this.minCameraZoom), this.maxCameraZoom);
    this.scrollDelta = 0;

    //panning
    const panSpeed = 1 / this.camera.zoom / this.panningSpeed;
    let panningDeltaX: number = 0;
    let panningDeltaY: number = 0;
    for (let i = 0; i < this.panDelta.length; i++) {
      panningDeltaX -= this.panDelta[i].mx;
      panningDeltaY += this.panDelta[i].my;
    }
    this.panDelta = [];
    this.target.add(new Vector3(panningDeltaX * panSpeed, panningDeltaY * panSpeed, 0).applyMatrix3(new Matrix3().getNormalMatrix(this.camera.matrix)))

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
    this.camera?.position.setFromSpherical(this.cameraCoordinates).add(this.target);
    this.camera?.lookAt(this.target);

    this.camera.updateProjectionMatrix();
  }

  private refreshStep(notFirstCall: boolean): void {
    if (notFirstCall)
      this.scene.remove(this.currentStepModel.newPartsModel, this.currentStepModel.prevPartsModel);

    if (this.currentStepNumber > this.instructionModel.instructionSteps.length || this.currentStepNumber <= 0)
      return; //if it's not a page with the normal model in it

    this.currentStepModel = this.instructionService.getModelByStep(this.instructionModel, this.currentStepNumber - 1);
    this.currentSubmodelAmount = this.currentStepModel.parentSubmodelAmount;

    if (this.enableAutoRotation) {
      //reset camera rotation
      this.cameraCoordinates = new Spherical(1, 1, 2.6);

      //rotate the model so that longest axis of the model is on the x-axis
      const allPartsGroup = new Group();
      allPartsGroup.add(this.currentStepModel.newPartsModel, this.currentStepModel.prevPartsModel);
      const allPartsBox = new Box3().setFromObject(allPartsGroup);
      const ySize = allPartsBox.max.y - allPartsBox.min.y;
      const xSize = allPartsBox.max.x - allPartsBox.min.x;
      const zSize = allPartsBox.max.z - allPartsBox.min.z;
      if (ySize > xSize && ySize > zSize) { //rotate the y-axis onto the x-axis
        this.currentStepModel.newPartsModel.rotateOnWorldAxis(new Vector3(0, 0, 1), -Math.PI / 2);
        this.currentStepModel.prevPartsModel.rotateOnWorldAxis(new Vector3(0, 0, 1), -Math.PI / 2);
      } else if (zSize > xSize && zSize > ySize) { //rotate the z-axis onto the x-axis
        this.currentStepModel.newPartsModel.rotateOnWorldAxis(new Vector3(0, 1, 0), -Math.PI / 2);
        this.currentStepModel.prevPartsModel.rotateOnWorldAxis(new Vector3(0, 1, 0), -Math.PI / 2);
      }

      //rotate the camera so that it (probably) looks at the new parts from the correct direction
      if (this.currentStepModel.prevPartsModel.children.length != 0) { //don't do anything if there's noe prev step
        const newPartCenter = new Box3().setFromObject(this.currentStepModel.newPartsModel).getCenter(new Vector3());
        const prevPartCenter = new Box3().setFromObject(this.currentStepModel.prevPartsModel).getCenter(new Vector3());
        const directionVector = newPartCenter.clone().sub(prevPartCenter);

        //TODO FIX THIS ROTATION
        /*if (directionVector.dot(new Vector3(0, 1, 0)) < 0) { //new parts are below -> flip it on x-axis by pi
          this.currentStepModel.newPartsModel.rotateOnAxis(new Vector3(1, 0, 0), Math.PI);
          this.currentStepModel.prevPartsModel.rotateOnAxis(new Vector3(1, 0, 0), Math.PI);
        }*/
        //TODO just a temporary fix also not good tho xD
        /*if (directionVector.dot(new Vector3(0, 1, -1)) < -0.01) //new parts are behind -> rotate on y-axis by pi
          this.cameraCoordinates.phi = Math.PI - this.cameraCoordinates.phi;*/
        if (directionVector.dot(new Vector3(0, 0, -1)) < -0.01) //new parts are behind -> rotate on y-axis by pi
          this.cameraCoordinates.theta += Math.PI;
        if (directionVector.dot(new Vector3(1, 0, 0)) < -0.01) //new parts are on the right side -> flip a little
          this.cameraCoordinates.theta = -this.cameraCoordinates.theta;
      }
    }

    //center the parts onto the center of newPartsModel
    const newPartsBox = new Box3().setFromObject(this.currentStepModel.newPartsModel);
    newPartsBox.getCenter(this.currentStepModel.prevPartsModel.position).multiplyScalar(-1);
    newPartsBox.getCenter(this.currentStepModel.newPartsModel.position).multiplyScalar(-1);

    //this.scene.add(new Box3Helper(new Box3().setFromObject(this.currentStepModel.newPartsModel),new Color(1,0,0)),new Box3Helper(new Box3().setFromObject(this.currentStepModel.prevPartsModel),new Color(0,1,0)));

    if ((this.enableAutoZoom || !notFirstCall) && this.camera) {
      const box = new Box3().setFromObject(this.currentStepModel.newPartsModel);
      const boxPoints = [
        new Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(this.camera.matrixWorld),
        new Vector3(box.min.x, box.min.y, box.max.z).applyMatrix4(this.camera.matrixWorld),
        new Vector3(box.min.x, box.max.y, box.min.z).applyMatrix4(this.camera.matrixWorld),
        new Vector3(box.min.x, box.max.y, box.max.z).applyMatrix4(this.camera.matrixWorld),
        new Vector3(box.max.x, box.min.y, box.min.z).applyMatrix4(this.camera.matrixWorld),
        new Vector3(box.max.x, box.min.y, box.max.z).applyMatrix4(this.camera.matrixWorld),
        new Vector3(box.max.x, box.max.y, box.min.z).applyMatrix4(this.camera.matrixWorld),
        new Vector3(box.max.x, box.max.y, box.max.z).applyMatrix4(this.camera.matrixWorld),
      ];
      const cameraBox: Box3 = new Box3().setFromPoints(boxPoints);
      const modelWidth: number = cameraBox.max.x - cameraBox.min.x;
      const modelHeight: number = cameraBox.max.y - cameraBox.min.y;
      const modelAspectRatio: number = modelWidth / modelHeight;
      const canvasAspectRatio: number = this.canvasSize.width / this.canvasSize.height;

      if (modelAspectRatio > canvasAspectRatio) { //if the model is wider than the canvas (in terms of aspect ratio)
        this.camera.left = -modelWidth / 2 * this.defaultZoomFactor;
        this.camera.right = modelWidth / 2 * this.defaultZoomFactor;
        this.camera.bottom = (-modelWidth / 2 / canvasAspectRatio) * this.defaultZoomFactor;
        this.camera.top = (modelWidth / 2 / canvasAspectRatio) * this.defaultZoomFactor;
      } else { //if the model is taller than the canvas (in terms of aspect ratio)
        this.camera.left = (-modelHeight / 2 * canvasAspectRatio) * this.defaultZoomFactor;
        this.camera.right = (modelHeight / 2 * canvasAspectRatio) * this.defaultZoomFactor;
        this.camera.bottom = -modelHeight / 2 * this.defaultZoomFactor;
        this.camera.top = modelHeight / 2 * this.defaultZoomFactor;
      }
      //expect a minimum size of the canvas
      if (this.camera.right < this.minimalZoom || this.camera.top < this.minimalZoom) {
        this.camera.left = -this.minimalZoom * canvasAspectRatio;
        this.camera.right = this.minimalZoom * canvasAspectRatio;
        this.camera.bottom = -this.minimalZoom;
        this.camera.top = this.minimalZoom;
      }
      this.camera.zoom = 1;
      this.camera.updateProjectionMatrix();
    }
    this.scene.add(this.currentStepModel.newPartsModel, this.currentStepModel.prevPartsModel);
  }

  createScene(): void {
    const newScene = new Scene();
    this.scene = newScene;

    //TODO remove
    /*const axesHelper = new AxesHelper(5);
    this.scene.add(axesHelper);*/

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
    if (!
      canvas || !canvasWrapper
    )
      return;
    this.canvasSize = {
      width: canvas.clientWidth,
      height: canvas.clientHeight
    };
    this.registerListeners(canvas);

    const camera = new OrthographicCamera(this.canvasSize.width / -2, this.canvasSize.width / 2, this.canvasSize.height / 2, this.canvasSize.height / -2, -1000, 1000);
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

      const prevAspectRatio: number = camera.right / camera.top;
      const newAspectRatio: number = canvasWrapper.clientWidth / canvasWrapper.clientHeight;
      camera.top = camera.top / (newAspectRatio / prevAspectRatio);
      camera.bottom = camera.bottom / (newAspectRatio / prevAspectRatio);
      camera.updateProjectionMatrix();
    });

    const update = () => {
      if (this.clock.getElapsedTime() > this.MAX_FPS) {
        this.updateControls();

        renderer.render(newScene, camera);

        this.clock.start()
      }
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
