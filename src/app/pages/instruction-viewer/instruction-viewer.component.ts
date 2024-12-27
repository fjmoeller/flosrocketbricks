import {Component, Inject, OnDestroy, OnInit, PLATFORM_ID} from '@angular/core';
import {
  AmbientLight, AxesHelper,
  BufferGeometry,
  Clock,
  DirectionalLight,
  Group,
  Material,
  Matrix3,
  OrthographicCamera,
  Scene,
  Spherical,
  Vector3,
  WebGLRenderer
} from "three";
import {
  AutoShowBottom,
  InstructionModel,
  InstructionPart,
  InstructionSettings,
  InstructionSubmodel,
  StepModel,
  StepPart
} from "../../model/instructions";
import {InstructionService} from "../../services/file/instruction.service";
import {LdrPart} from "../../model/ldrawParts";
import {ActivatedRoute} from "@angular/router";
import {MocGrabberService} from "../../services/grabber/moc-grabber.service";
import {Box3} from "three/src/math/Box3.js";
import {File, Moc, Version} from "../../model/classes";
import {MetaServiceService} from "../../services/meta-service.service";
import {isPlatformBrowser, Location, NgStyle} from "@angular/common";
import {InstructionDownloadComponent} from "../../components/instruction-download/instruction-download.component";
import {InstructionCoverComponent} from "../../components/instruction-cover/instruction-cover.component";
import {LdrawColorService} from "../../services/color/ldraw-color.service";
import {InstructionSettingsComponent} from "../../components/instruction-settings/instruction-settings.component";
import {InstructionSettingsService} from "../../services/viewer/instruction-settings.service";

@Component({
  selector: 'app-instruction-viewer',
  standalone: true,
  templateUrl: './instruction-viewer.component.html',
  imports: [
    InstructionDownloadComponent,
    InstructionCoverComponent,
    NgStyle,
    InstructionSettingsComponent
  ],
  styleUrl: './instruction-viewer.component.sass'
})
export class InstructionViewerComponent implements OnInit, OnDestroy {

  //TODO make touch zoom and pan possible
  //TODO add buttons: go to end go to start
  //TODO calc rotation already when creating steps -> add flip symbols
  //TODO add reset view button???
  //TODO add small star onto metallic parts in the parts list as indicator
  //TODO make reminder that green parts can be of any color: in beginning at end and in steps if it's used, maybe also in the hover over thing?

  moc?: Moc;
  file: File;
  version: Version;
  loadingFinished: boolean = true;
  loadingText: string = "Loading...";
  renderingActive: boolean = false;
  currentStepNumber: number = 0;
  currentSubmodelAmount: number = 0;
  isStepPage: boolean = false;

  private isDragging: boolean[] = [];
  private isPanning: boolean = false;
  private scrollDelta: number[] = [];
  private dragDelta: { mx: number, my: number }[][] = [];
  private panDelta: { mx: number, my: number }[] = [];
  private previousTouch: (TouchEvent | null)[] = [];
  private touchStartDistance: number = 0;

  currentStepModel: StepModel;
  instructionModel: InstructionModel;

  private windowListenersRegistered: boolean = false;

  private canvas!: HTMLCanvasElement;
  private instructionWrapper!: HTMLDivElement;
  private contentWrapper!: HTMLDivElement;
  private mainContent!: HTMLDivElement;
  private partListContent!: HTMLDivElement;

  private axesHelperContent!: HTMLDivElement;

  private submodelIndicatorWrapper!: HTMLDivElement;
  private submodelIndicatorContent!: HTMLDivElement;

  private backgroundMainContent!: HTMLDivElement;
  private backgroundSubmodelIndicator!: HTMLDivElement;
  private backgroundPartlistContent!: HTMLDivElement;

  private mainScene: Scene = new Scene();
  private axesHelperScene: Scene = new Scene();
  private submodelIndicatorScene: Scene = new Scene();
  private partListScenes: Scene[] = [];
  private mainCamera: OrthographicCamera = new OrthographicCamera();
  private submodelIndicatorCamera: OrthographicCamera = new OrthographicCamera();
  private axesHelperCamera: OrthographicCamera = new OrthographicCamera();
  private mainCameraPosition!: Spherical;
  private submodelIndicatorCameraCoordinates!: Spherical;
  private partListCameraCoordinates: Spherical[] = [];
  private renderer!: WebGLRenderer;
  private target: Vector3 = new Vector3(0, 0, 0);
  private submodelIndicatorGroup?: Group;

  readonly clock: Clock = new Clock();

  instructionSettings!: InstructionSettings;

  constructor(private location: Location, private instructionService: InstructionService,
              private route: ActivatedRoute, private mocGrabberService: MocGrabberService,
              private metaService: MetaServiceService, private ldrawColorService: LdrawColorService,
              private instructionSettingsService: InstructionSettingsService, @Inject(PLATFORM_ID) private platform: Object) {
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
      const initialStep = (Number(paramMap.get('stepIndex')) || 0);
      if (moc && file && file.instructions) {
        this.file = file;
        this.version = version;
        this.currentStepNumber = initialStep;
        await this.refreshPage();
      }
    });
  }

  async refreshPage() {
    this.instructionSettings = this.instructionSettingsService.getInstructionSettings();
    this.loadingFinished = false;
    if (this.file.instructions && isPlatformBrowser(this.platform)) {
      this.metaService.setDefaultTags(this.file.name + " Online Instructions - FlosRocketBricks", window.location.href);
      this.instructionModel = await this.instructionService.getInstructionModel(this.file.link, this.file.instructions, this.instructionSettings.prevInterpolationColor, this.instructionSettings.prevInterpolationPercentage);
      this.collectElementReferences();
      this.createRenderer();
      this.createMainScene();
      this.createAxesHelperScene();
      this.createSubmodelIndicatorScene();
      this.refreshStep();
      this.registerWindowListeners();
      this.startRenderLoop();
    }
  }

  ngOnDestroy(): void {
    this.renderingActive = false;
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }

  private collectElementReferences(): void {
    this.instructionWrapper = document.getElementById('instruction-wrapper')! as HTMLDivElement;

    this.canvas = document.getElementById('canvas-viewer')! as HTMLCanvasElement;

    this.contentWrapper = document.getElementById("content") as HTMLDivElement;
    this.partListContent = document.getElementById("partlist-content") as HTMLDivElement;
    this.mainContent = document.getElementById("main-content") as HTMLDivElement;

    this.submodelIndicatorWrapper = document.getElementById("submodel-indicator-wrapper") as HTMLDivElement;
    this.submodelIndicatorContent = document.getElementById("submodel-indicator-content") as HTMLDivElement;

    this.backgroundMainContent = document.getElementById("background-main-content") as HTMLDivElement;
    this.backgroundSubmodelIndicator = document.getElementById("background-submodel-indicator") as HTMLDivElement;
    this.backgroundPartlistContent = document.getElementById("background-partlist-content") as HTMLDivElement;

    this.axesHelperContent = document.getElementById("axes-helper-content") as HTMLDivElement;
  }

  private registerListeners(htmlElement: HTMLElement, htmlElementIndex: number, enablePan: boolean, enableZoom: boolean) {
    htmlElement.addEventListener('mousedown', event => {
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();
      if (event.button === 0)
        this.isDragging[htmlElementIndex] = true;
      else if (event.button === 2 && enablePan)
        this.isPanning = true;
    });
    htmlElement.addEventListener('touchstart', event => {
      /*event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();*/
      if (event.touches.length === 1) {
        this.isDragging[htmlElementIndex] = true;
      } else if (event.touches.length === 2) {
        this.touchStartDistance = Math.sqrt((event.touches[1].clientX - event.touches[0].clientX) ^ 2 + (event.touches[1].clientY - event.touches[0].clientY) ^ 2);
      }
      this.previousTouch[htmlElementIndex] = event;
    });
    htmlElement.addEventListener('mouseup', event => {
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();
      if (event.button === 0)
        this.isDragging[htmlElementIndex] = false;
      else if (event.button === 2 && enablePan)
        this.isPanning = false;
    });
    htmlElement.addEventListener('touchend', () => {
      /*event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();*/
      const prevTouch = this.previousTouch[htmlElementIndex];
      if (prevTouch) {
        if (prevTouch.touches.length === 1) {
          this.isDragging[htmlElementIndex] = false;
          this.previousTouch[htmlElementIndex] = null;

          this.touchStartDistance = 0;
        }
      }
    });
    htmlElement.addEventListener('touchcancel', event => {
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();
      const prevTouch = this.previousTouch[htmlElementIndex];
      if (prevTouch) {
        if (prevTouch.touches.length === 1) {
          this.isDragging[htmlElementIndex] = false;
          this.previousTouch[htmlElementIndex] = null;

          this.touchStartDistance = 0;
        }
      }
    });
    htmlElement.addEventListener('wheel', event => {
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();
      this.scrollDelta[htmlElementIndex] += event.deltaY;
    });
    htmlElement.addEventListener('mousemove', event => {
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();
      if (this.isDragging[htmlElementIndex])
        this.dragDelta[htmlElementIndex].push({mx: event.movementX, my: event.movementY});
      if (this.isPanning && enablePan)
        this.panDelta.push({mx: event.movementX, my: event.movementY});
    });
    htmlElement.addEventListener('touchmove', event => {
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();
      const prevTouch = this.previousTouch[htmlElementIndex];
      if (event.touches.length === 1 && prevTouch) { //rotation
        const deltaX = event.touches[0].clientX - prevTouch.touches[0].clientX;
        const deltaY = event.touches[0].clientY - prevTouch.touches[0].clientY;
        this.dragDelta[htmlElementIndex].push({mx: deltaX, my: deltaY});
      } else if (event.touches.length === 2 && this.touchStartDistance !== 0 && enableZoom) {
        const currentDistance = Math.sqrt((event.touches[1].clientX - event.touches[0].clientX) ^ 2 + (event.touches[1].clientY - event.touches[0].clientY) ^ 2);
        if (Math.abs(this.touchStartDistance - currentDistance) > this.instructionSettings.touchZoomEpsilon) { //TOOD umdrehen?
          this.scrollDelta[htmlElementIndex] += (this.touchStartDistance - currentDistance) * this.instructionSettings.touchZoomSpeed;
        }
      }
      this.previousTouch[htmlElementIndex] = event;
    });
  }

  private registerWindowListeners() {
    if (this.windowListenersRegistered) return;
    this.windowListenersRegistered = true;
    document.addEventListener('keydown', event => {
      if (!this.loadingFinished) return;
      switch (event.key) {
        case "ArrowRight":
          this.nextStep();
          break;
        case "ArrowLeft":
          this.previousStep();
          break;
      }
    });
    window.addEventListener('resize', () => {
      if (!this.loadingFinished) return;
      this.canvas.style.width = this.contentWrapper.clientWidth + "px";
      this.canvas.style.height = this.contentWrapper.clientHeight + "px";
      this.instructionWrapper.style.height = this.contentWrapper.clientHeight + "px";
      this.renderer.setSize(this.contentWrapper.clientWidth, this.contentWrapper.clientHeight);

      if (this.instructionSettings.enableAutoZoom && this.isStepPage) {
        this.adjustCameraToModel(this.currentStepModel.newPartsModel, this.mainCamera, this.mainContent, this.instructionSettings.autoZoomFactor, this.instructionSettings.minimalAutoZoom);
      }
    });
  }

  previousStep() {
    if (this.currentStepNumber <= 0) return;
    this.currentStepNumber -= 1;
    this.refreshStep();
    this.changeStepInPath();
  }

  nextStep() {
    if (this.currentStepNumber >= this.instructionModel.instructionSteps.length + 1) return;
    this.currentStepNumber += 1;
    this.refreshStep();
    this.changeStepInPath();
  }

  private changeStepInPath(): void {
    const pathSegments = this.location.path().split('/');
    if (pathSegments.length === 6) {
      pathSegments[pathSegments.length - 1] = this.currentStepNumber + "";
      const newPath = pathSegments.join('/') + '/';
      this.location.replaceState(newPath);
    } else {
      pathSegments[pathSegments.length - 2] = this.currentStepNumber + "";
      const newPath = pathSegments.join('/');
      this.location.replaceState(newPath);
    }
  }

  private updateControls(camera: OrthographicCamera, cameraTarget: Vector3, cameraCoordinates: Spherical,
                         elementIndex: number, enablePan: boolean, zoomSpeed: number, minCameraZoom: number,
                         maxCameraZoom: number, rotationSpeed: number): void {
    //zooming in
    camera.zoom = Math.max(Math.min(camera.zoom - (this.scrollDelta[elementIndex] * zoomSpeed), minCameraZoom), maxCameraZoom);
    this.scrollDelta[elementIndex] = 0;

    if (enablePan) {
      //panning
      const panSpeed = 1 / camera.zoom / this.instructionSettings.panningSpeed;
      let panningDeltaX: number = 0;
      let panningDeltaY: number = 0;
      for (let i = 0; i < this.panDelta.length; i++) {
        panningDeltaX -= this.panDelta[i].mx;
        panningDeltaY += this.panDelta[i].my;
      }
      this.panDelta = [];
      cameraTarget.add(new Vector3(panningDeltaX * panSpeed, panningDeltaY * panSpeed, 0).applyMatrix3(new Matrix3().getNormalMatrix(camera.matrix)));
    }

    //rotating & position
    let draggingDeltaX: number = 0;
    let draggingDeltaY: number = 0;
    for (let i = 0; i < this.dragDelta[elementIndex].length; i++) {
      draggingDeltaX += this.dragDelta[elementIndex][i].mx;
      draggingDeltaY += this.dragDelta[elementIndex][i].my;
    }
    this.dragDelta[elementIndex] = [];
    cameraCoordinates.theta -= draggingDeltaX * rotationSpeed;
    cameraCoordinates.phi -= draggingDeltaY * rotationSpeed;
    // no camera flipping
    cameraCoordinates.phi = Math.max(0.05, Math.min(Math.PI - 0.05, cameraCoordinates.phi));
    camera.position.setFromSpherical(cameraCoordinates).add(cameraTarget);
    camera.lookAt(cameraTarget);

    camera.updateProjectionMatrix();
  }

  private refreshStep(): void {
    this.clearScenes();

    this.isStepPage = this.currentStepNumber <= this.instructionModel.instructionSteps.length && this.currentStepNumber > 0;
    //if it's not a page a step is being shown at then skip it
    if (!this.isStepPage) {
      this.instructionWrapper.style.height = this.contentWrapper.clientHeight + "px";
      this.canvas.style.height = this.contentWrapper.clientHeight + "px";
      this.backgroundPartlistContent.style.height = this.partListContent.clientHeight + "px";
      this.renderer.setSize(this.contentWrapper.clientWidth, this.contentWrapper.clientHeight);
      this.renderer.clear();
      this.initializeControlBuffers();
      this.updateSubmodelIndicatorScene();
      return;
    }

    //fetch new step
    this.currentStepModel = this.instructionService.getModelByStep(this.instructionModel, this.currentStepNumber - 1);
    this.currentSubmodelAmount = this.currentStepModel.parentSubmodelAmount;

    //create the divs and scenes for the new parts of the part list
    this.updatePartListScenes();

    //initialize the lists n stuff for the camera control
    this.initializeControlBuffers();

    this.instructionWrapper.style.height = this.contentWrapper.clientHeight + "px";
    this.backgroundPartlistContent.style.height = this.partListContent.clientHeight + "px";
    this.canvas.style.height = this.contentWrapper.clientHeight + "px";
    this.renderer.setSize(this.contentWrapper.clientWidth, this.contentWrapper.clientHeight);

    this.updateMainScene();
    //this.mainScene.add(new Box3Helper(new Box3().setFromObject(this.currentStepModel.newPartsModel), new Color(0x0000ff)));
    //this.mainScene.add(new Box3Helper(new Box3().setFromObject(this.currentStepModel.prevPartsModel), new Color(0xff0000)));
    this.updateSubmodelIndicatorScene();
  }

  private initializeControlBuffers(): void {
    this.dragDelta = [];
    this.isDragging = [];
    this.scrollDelta = [];
    this.previousTouch = [];
    for (let i = 0; i < this.currentStepModel.stepPartsList.length + 2; i++) { //+2 because the main scene and submodelindicator scenes are in there too
      this.dragDelta.push([]);
      this.isDragging.push(false);
      this.scrollDelta.push(0);
      this.previousTouch.push(null);
    }
  }

  private adjustCameraToModel(model: Group, camera: OrthographicCamera, htmlElement: HTMLElement,
                              defaultZoomFactor: number, minimalZoom: number) {
    const cameraBox: Box3 = this.getCameraBox(model, camera);
    const modelWidth: number = cameraBox.max.x - cameraBox.min.x;
    const modelHeight: number = cameraBox.max.y - cameraBox.min.y;
    const modelAspectRatio: number = modelWidth / modelHeight;
    const canvasAspectRatio: number = htmlElement.clientWidth / htmlElement.clientHeight;

    if (modelAspectRatio > canvasAspectRatio) { //if the model is wider than the canvas (in terms of aspect ratio)
      camera.left = -modelWidth / 2 * defaultZoomFactor;
      camera.right = modelWidth / 2 * defaultZoomFactor;
      camera.bottom = (-modelWidth / 2 / canvasAspectRatio) * defaultZoomFactor;
      camera.top = (modelWidth / 2 / canvasAspectRatio) * defaultZoomFactor;
    } else { //if the model is taller than the canvas (in terms of aspect ratio)
      camera.left = (-modelHeight / 2 * canvasAspectRatio) * defaultZoomFactor;
      camera.right = (modelHeight / 2 * canvasAspectRatio) * defaultZoomFactor;
      camera.bottom = -modelHeight / 2 * defaultZoomFactor;
      camera.top = modelHeight / 2 * defaultZoomFactor;
    }
    //expect a minimum size of the canvas
    if (camera.right < minimalZoom || camera.top < minimalZoom) {
      camera.left = -minimalZoom * canvasAspectRatio;
      camera.right = minimalZoom * canvasAspectRatio;
      camera.bottom = -minimalZoom;
      camera.top = minimalZoom;
    }
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    return modelWidth;
  }

  private createRenderer(): void {
    this.renderer = new WebGLRenderer({antialias: true, canvas: this.canvas});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(this.instructionSettings.mainBgColor);
    this.renderer.autoClear = false;
  }

  private createDefaultScene(): Scene {
    const scene = new Scene();
    const pointLight = new DirectionalLight(0xffffff, 0.5);
    pointLight.position.set(100, 100, -100);
    scene.add(pointLight);
    const pointLight2 = new DirectionalLight(0xffffff, 0.5);
    pointLight2.position.set(-100, -100, 100);
    scene.add(pointLight2);
    const ambientLight = new AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    return scene;
  }

  private createAxesHelperScene(): Scene {
    const scene = new Scene();
    scene.add(new AxesHelper(1));
    scene.add(this.axesHelperCamera);
    this.axesHelperCamera = new OrthographicCamera(-1, 1, 1, -1, -8, 8);
    this.axesHelperScene = scene;
    return scene;
  }

  private createMainScene(): void {
    const scene = this.createDefaultScene();
    this.mainScene = scene;

    const camera = new OrthographicCamera(this.mainContent.clientWidth / -2, this.mainContent.clientWidth / 2, this.mainContent.clientHeight / 2, this.mainContent.clientHeight / -2, -1000, 1000);
    scene.add(camera);
    this.mainCamera = camera;

    //scene.add(new AxesHelper(20));

    this.mainCameraPosition = this.instructionSettings.defaultMainCameraPosition.clone();

    scene.userData['element'] = this.mainContent;
    scene.userData['camera'] = camera;

    this.registerListeners(this.mainContent, 0, true, true);
  }

  private updateMainScene(): void {
    //change the view for the main canvas from here on
    if (this.instructionSettings.enableAutoRotation) {
      //reset camera rotation
      this.mainCameraPosition = this.instructionSettings.defaultMainCameraPosition.clone();

      //reset camera target
      if (this.instructionSettings.resetTargetOnPageChange)
        this.target = new Vector3(0, 0, 0);

      //rotate the model so that longest axis of the model is on the x-axis
      if (this.instructionSettings.enableLongestOntoXAxisFlip) {
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
      }

      //rotate the camera so that it (probably) looks at the new parts from the correct direction
      if (this.currentStepModel.prevPartsModel.children.length != 0) { //don't do anything if there's noe prev step
        const newPartCenter = new Box3().setFromObject(this.currentStepModel.newPartsModel).getCenter(new Vector3());
        const prevPartCenter = new Box3().setFromObject(this.currentStepModel.prevPartsModel).getCenter(new Vector3());
        const directionVector = newPartCenter.clone().sub(prevPartCenter);

        if (directionVector.dot(new Vector3(0, 1, 0)) < this.instructionSettings.autoShowBottomThreshold && this.instructionSettings.autoShowBottom === AutoShowBottom.FLIP) { //new parts are below -> flip it on x-axis by pi
          this.currentStepModel.newPartsModel.rotateOnAxis(new Vector3(1, 0, 0), Math.PI);
          this.currentStepModel.prevPartsModel.rotateOnAxis(new Vector3(1, 0, 0), Math.PI);
        } else if (directionVector.dot(new Vector3(0, 1, 0)) < this.instructionSettings.autoShowBottomThreshold && this.instructionSettings.autoShowBottom === AutoShowBottom.ROTATE) //new parts are below -> rotate camera a little downwards
        {
          this.mainCameraPosition.phi = Math.PI - this.mainCameraPosition.phi;
        }

        if (directionVector.dot(new Vector3(0, 0, -1)) < -0.01) { //new parts are behind -> rotate on y-axis by pi //TODO check again
          this.mainCameraPosition.theta += Math.PI; //
          if (directionVector.dot(new Vector3(-1, 0, 0)) < -0.01) { //new parts are on the right side -> flip a little
            this.mainCameraPosition.theta = -this.mainCameraPosition.theta;
          }
        } else if (directionVector.dot(new Vector3(1, 0, 0)) < -0.01) { //new parts are on the right side -> flip a little
          this.mainCameraPosition.theta = -this.mainCameraPosition.theta;
        }
      }
    }

    //center the parts onto the center of newPartsModel
    const newPartsBox = new Box3().setFromObject(this.currentStepModel.newPartsModel);
    newPartsBox.getCenter(this.currentStepModel.prevPartsModel.position).multiplyScalar(-1);
    newPartsBox.getCenter(this.currentStepModel.newPartsModel.position).multiplyScalar(-1);

    if (this.instructionSettings.enableAutoZoom && this.isStepPage) {
      this.adjustCameraToModel(this.currentStepModel.newPartsModel, this.mainCamera, this.mainContent, this.instructionSettings.autoZoomFactor, this.instructionSettings.minimalAutoZoom);
    }

    this.mainScene.add(this.currentStepModel.newPartsModel, this.currentStepModel.prevPartsModel);
  }

  private createSubmodelIndicatorScene() {
    const scene = this.createDefaultScene();
    this.submodelIndicatorScene = scene;

    const camera = new OrthographicCamera(this.submodelIndicatorContent.clientWidth / -2, this.submodelIndicatorContent.clientWidth / 2, this.submodelIndicatorContent.clientHeight / 2, this.submodelIndicatorContent.clientHeight / -2, -1000, 1000);
    scene.add(camera);
    this.submodelIndicatorCamera = camera;

    scene.userData['element'] = this.submodelIndicatorContent;
    scene.userData['camera'] = camera;

    this.registerListeners(this.submodelIndicatorContent, 1, false, false);
  }

  private updateSubmodelIndicatorScene() {
    if (this.isStepPage && this.currentStepModel.parentSubmodelModel) {
      //enable the div with that'll hold the model
      this.submodelIndicatorWrapper.style.display = 'block';
      this.backgroundSubmodelIndicator.style.display = 'block';

      this.submodelIndicatorCameraCoordinates = this.instructionSettings.defaultPartListCameraPosition.clone();
      this.submodelIndicatorCamera.position.setFromSpherical(this.submodelIndicatorCameraCoordinates);
      this.submodelIndicatorCamera.lookAt(new Vector3(0, 0, 0));

      this.submodelIndicatorGroup = this.currentStepModel.parentSubmodelModel.clone();
      this.submodelIndicatorGroup.rotateX(Math.PI);
      this.submodelIndicatorGroup.rotateY(-Math.PI / 2);

      new Box3().setFromObject(this.submodelIndicatorGroup).getCenter(this.submodelIndicatorGroup.position).multiplyScalar(-1);
      this.adjustCameraToModel(this.submodelIndicatorGroup, this.submodelIndicatorCamera, this.submodelIndicatorContent,
        this.instructionSettings.partListAutoZoomFactor, this.instructionSettings.partListMinimalAutoZoom);

      this.submodelIndicatorScene.add(this.submodelIndicatorGroup);
    } else {
      this.submodelIndicatorWrapper.style.display = 'none';
      this.backgroundSubmodelIndicator.style.display = 'none';
      this.submodelIndicatorGroup = undefined;
    }
  }

  private updatePartListScenes(): void {
    for (let i = 0; i < this.currentStepModel.stepPartsList.length; i++) {

      const stepPart: StepPart = this.currentStepModel.stepPartsList[i];
      const colorName = this.ldrawColorService.getLdrawColorNameByColorId(stepPart.color).split('_').join(' ');
      let partId = stepPart.partId;
      if (stepPart.partId.endsWith(".dat"))
        partId = stepPart.partId.slice(0, stepPart.partId.length - 4);

      const partDiv: HTMLDivElement = document.createElement('div');
      partDiv.id = "partlist-element-" + i;
      partDiv.style.margin = '5px';
      partDiv.style.position = 'relative';
      partDiv.style.height = '6rem';

      const toolTipDiv: HTMLDivElement = document.createElement('div');
      toolTipDiv.style.padding = '5px';
      toolTipDiv.style.borderRadius = '5px';
      toolTipDiv.style.visibility = 'hidden';
      toolTipDiv.style.position = 'absolute';
      toolTipDiv.style.bottom = '100%';
      toolTipDiv.style.left = '0';
      toolTipDiv.style.color = 'white';
      toolTipDiv.style.backgroundColor = '#444';
      toolTipDiv.style.width = '15rem';
      toolTipDiv.innerText = "LDraw-ID: " + partId + "\nName: " + stepPart.partName + "\nColor: " + colorName + "";

      partDiv.addEventListener('mouseenter', () => {
        toolTipDiv.style.visibility = 'visible';
        partDiv.style.boxShadow = 'rgba(0, 0, 0, 0.12) 0 1px 3px, rgba(0, 0, 0, 0.24) 0 1px 2px';
      });
      partDiv.addEventListener('mouseleave', () => {
        toolTipDiv.style.visibility = 'hidden';
        partDiv.style.boxShadow = '';
      });
      partDiv.addEventListener('touchstart', () => toolTipDiv.style.visibility = 'visible');
      partDiv.addEventListener('touchend', () => toolTipDiv.style.visibility = 'hidden');
      partDiv.addEventListener('touchcancel', () => toolTipDiv.style.visibility = 'hidden');

      const sceneDiv: HTMLDivElement = document.createElement('div');
      sceneDiv.id = "partlist-element-scene-" + i;
      sceneDiv.style.touchAction = 'none';
      sceneDiv.style.height = '100%';
      sceneDiv.style.width = '6rem';

      const amountDiv: HTMLHeadingElement = document.createElement('h4');
      amountDiv.innerText = stepPart.quantity + 'x';
      amountDiv.style.position = 'absolute';
      amountDiv.style.bottom = '0';
      amountDiv.style.marginBottom = '0';
      partDiv.appendChild(sceneDiv);
      partDiv.appendChild(toolTipDiv);
      partDiv.appendChild(amountDiv);
      this.partListContent.appendChild(partDiv);

      this.registerListeners(sceneDiv, i + 2, false, false);

      const scene = this.createDefaultScene();
      const partGroup: Group = stepPart.model.clone();

      scene.add(partGroup);
      partGroup.rotateX(Math.PI);
      partGroup.rotateY(-Math.PI / 2);
      new Box3().setFromObject(partGroup).getCenter(partGroup.position).multiplyScalar(-1);

      const camera = new OrthographicCamera(sceneDiv.clientWidth / -2, sceneDiv.clientWidth / 2, sceneDiv.clientHeight / 2, sceneDiv.clientHeight / -2, -1000, 1000);
      const cameraCoordinates = this.instructionSettings.defaultPartListCameraPosition.clone();
      this.partListCameraCoordinates[i] = cameraCoordinates;
      camera.position.setFromSpherical(cameraCoordinates);
      camera.lookAt(0, 0, 0);
      scene.add(camera);

      if (this.instructionSettings.enablePartListSmallPartScaling) {

        const cameraBox = this.getCameraBox(partGroup, camera);
        const modelWidth: number = cameraBox.max.x - cameraBox.min.x;
        if (modelWidth < this.instructionSettings.partListSmallPartScalingThreshold) {
          sceneDiv.style.width = '3rem';
        }
      }

      this.adjustCameraToModel(partGroup, camera, sceneDiv, this.instructionSettings.partListAutoZoomFactor, this.instructionSettings.partListMinimalAutoZoom);

      scene.userData["element"] = sceneDiv;
      scene.userData["camera"] = camera;
      this.partListScenes.push(scene);
    }
  }

  private getCameraBox(partGroup: Group, camera: OrthographicCamera): Box3 {
    camera.updateMatrixWorld();
    const box = new Box3().setFromObject(partGroup);
    const boxPoints = [
      new Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(camera.matrixWorldInverse),
      new Vector3(box.min.x, box.min.y, box.max.z).applyMatrix4(camera.matrixWorldInverse),
      new Vector3(box.min.x, box.max.y, box.min.z).applyMatrix4(camera.matrixWorldInverse),
      new Vector3(box.min.x, box.max.y, box.max.z).applyMatrix4(camera.matrixWorldInverse),
      new Vector3(box.max.x, box.min.y, box.min.z).applyMatrix4(camera.matrixWorldInverse),
      new Vector3(box.max.x, box.min.y, box.max.z).applyMatrix4(camera.matrixWorldInverse),
      new Vector3(box.max.x, box.max.y, box.min.z).applyMatrix4(camera.matrixWorldInverse),
      new Vector3(box.max.x, box.max.y, box.max.z).applyMatrix4(camera.matrixWorldInverse),
    ];
    return new Box3().setFromPoints(boxPoints);
  }

  private clearScenes() {
    //clear main scene
    if (this.currentStepModel.newPartsModel)
      this.mainScene.remove(this.currentStepModel.newPartsModel);
    if (this.currentStepModel.prevPartsModel)
      this.mainScene.remove(this.currentStepModel.prevPartsModel);
    if (this.submodelIndicatorGroup)
      this.submodelIndicatorScene.remove(this.submodelIndicatorGroup);

    //clear part list divs
    while (this.partListContent.hasChildNodes() && this.partListContent.lastChild)
      this.partListContent.removeChild(this.partListContent.lastChild);
    this.partListScenes = [];
    this.partListCameraCoordinates = [];

    this.currentStepModel.stepPartsList = [];
    this.submodelIndicatorGroup = undefined;
  }

  private startRenderLoop() {

    /*const composer = new EffectComposer( this.renderer );
    const renderPass = new RenderPass( this.mainScene, this.mainCamera );
    composer.addPass( renderPass );
    const outlinePass = new OutlinePass( new Vector2( window.innerWidth, window.innerHeight ), this.mainScene, this.mainCamera );
    outlinePass.edgeStrength = 10;
    outlinePass.edgeGlow =0;
    outlinePass.edgeThickness = 4;
    outlinePass.pulsePeriod = 0;
    outlinePass.visibleEdgeColor.set( "#ffffff" );
    outlinePass.hiddenEdgeColor.set( "#000000" );
    outlinePass.selectedObjects = [this.currentStepModel.newPartsModel];
    composer.addPass( outlinePass );
    const effectFXAA = new ShaderPass(FXAAShader);
    effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
    effectFXAA.renderToScreen = true;
    composer.addPass(effectFXAA);
    composer.addPass(outlinePass);*/

    this.loadingFinished = true;
    this.renderingActive = true;

    const update = () => {
      if (this.clock.getElapsedTime() > (1 / this.instructionSettings.maxFps) && this.loadingFinished) {
        this.clock.start();

        //MAIN SCENE
        this.updateControls(this.mainCamera, this.target, this.mainCameraPosition, 0, true,
          this.instructionSettings.cameraZoomSpeed, this.instructionSettings.cameraMinZoom, this.instructionSettings.cameraMaxZoom, this.instructionSettings.cameraRotationSpeed);
        // get its position relative to the page's viewport
        const mainRectElement = this.mainScene.userData["element"].getBoundingClientRect();
        const rectCanvas = this.canvas.getBoundingClientRect();
        // this.renderer.setViewport(0, 0, rectElement.width, rectElement.height);
        // this.renderer.setScissor(0, 0, rectElement.width, rectElement.height);
        // this.renderer.clearColor();
        // this.renderer.clearDepth();
        this.renderer.setViewport(0, rectCanvas.bottom - mainRectElement.bottom, mainRectElement.width, mainRectElement.height);
        this.renderer.setScissor(0, rectCanvas.bottom - mainRectElement.bottom, mainRectElement.width, mainRectElement.height);
        this.renderer.render(this.mainScene, this.mainScene.userData["camera"]);
        //composer.render();

        if (this.instructionSettings.enableAxisHelper && this.isStepPage) {
          //AXIS HELPER HERE
          const axesRectElement = this.axesHelperContent.getBoundingClientRect(); //TODO also copy over newParts rotation?
          const coords = this.mainCameraPosition.clone();
          coords.radius = 1;
          this.axesHelperCamera.position.setFromSpherical(coords);
          this.axesHelperCamera.lookAt(new Vector3(0, 0, 0));
          this.renderer.setViewport(axesRectElement.left - rectCanvas.left, rectCanvas.bottom - axesRectElement.bottom, axesRectElement.width, axesRectElement.height);
          this.renderer.setScissor(axesRectElement.left - rectCanvas.left, rectCanvas.bottom - axesRectElement.bottom, axesRectElement.width, axesRectElement.height);
          this.renderer.render(this.axesHelperScene, this.axesHelperCamera);
        }

        //SUBMODEL INDICATOR SCENE
        if (this.submodelIndicatorGroup && this.isStepPage) {
          this.updateControls(this.submodelIndicatorCamera, new Vector3(0, 0, 0), this.submodelIndicatorCameraCoordinates, 1, false,
            this.instructionSettings.partListCameraZoomSpeed, this.instructionSettings.partListMinCameraZoom, this.instructionSettings.partListMaxCameraZoom, this.instructionSettings.partListCameraRotationSpeed);

          const scene = this.submodelIndicatorScene;

          // get its position relative to the page's viewport
          const rectElement = this.submodelIndicatorContent.getBoundingClientRect();

          this.renderer.setViewport(rectElement.left - rectCanvas.left, rectCanvas.bottom - rectElement.bottom, rectElement.width, rectElement.height);
          this.renderer.setScissor(rectElement.left - rectCanvas.left, rectCanvas.bottom - rectElement.bottom, rectElement.width, rectElement.height);
          this.renderer.render(scene, this.submodelIndicatorCamera);
        }

        //PART LIST SCENES
        for (let i = 0; i < this.partListScenes.length; i++) {
          const partListScene = this.partListScenes[i];
          const partListElement: HTMLDivElement = partListScene.userData["element"];
          const partListCamera: OrthographicCamera = partListScene.userData["camera"];

          // get its position relative to the page's viewport
          const rectPartlistElement = partListElement.getBoundingClientRect();
          const left = rectPartlistElement.left - rectCanvas.left;
          const top = rectCanvas.bottom - rectPartlistElement.bottom;

          this.updateControls(partListCamera, new Vector3(0, 0, 0), this.partListCameraCoordinates[i], i + 2, false,
            this.instructionSettings.partListCameraZoomSpeed, this.instructionSettings.partListMinCameraZoom, this.instructionSettings.partListMaxCameraZoom, this.instructionSettings.partListCameraRotationSpeed);

          // set the viewport
          this.renderer.setViewport(left, top, rectPartlistElement.width, rectPartlistElement.height);
          this.renderer.setScissor(left, top, rectPartlistElement.width, rectPartlistElement.height);
          // this.renderer.clearColor();
          // this.renderer.clearDepth();
          this.renderer.render(partListScene, partListCamera);
        }
      }
      if (this.renderingActive)
        window.requestAnimationFrame(update);
    };

    update();
  }
}
