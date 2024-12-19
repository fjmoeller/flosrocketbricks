import {Component, OnDestroy, OnInit} from '@angular/core';
import {
  AmbientLight,
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
import {InstructionModel, InstructionPart, InstructionSubmodel, StepModel, StepPart} from "../../model/instructions";
import {InstructionService} from "../../services/file/instruction.service";
import {LdrPart} from "../../model/ldrawParts";
import {ActivatedRoute} from "@angular/router";
import {MocGrabberService} from "../../services/grabber/moc-grabber.service";
import {Box3} from "three/src/math/Box3.js";
import {File, Moc, Version} from "../../model/classes";
import {MetaServiceService} from "../../services/meta-service.service";
import {Location} from "@angular/common";

@Component({
  selector: 'app-instruction-viewer',
  standalone: true,
  templateUrl: './instruction-viewer.component.html',
  imports: [],
  styleUrl: './instruction-viewer.component.sass'
})
export class InstructionViewerComponent implements OnInit, OnDestroy {

  //TODO fix the rotation stuff or comment back in i guess
  //TODO fix resizing window problem
  //TODO make more performing by using one canvas//webgl instance
  //TODO make touch zoom and pan possible
  //TODO add settings
  //TODO add buttons: go to end go to start
  //TODO auto switch url to page with each page change
  //TODO simplify code
  //TODO calc rotation already when creating steps -> add flip symbols
  //TODO add axis indicator

  moc?: Moc;
  file: File;
  version: Version;
  loadingFinished: boolean = true;
  loadingText: string = "Loading...";
  renderingActive: boolean = false;
  currentStepNumber: number = 0;
  currentSubmodelAmount: number = 0;

  private isDragging: boolean[] = [];
  private isPanning: boolean = false;
  private scrollDelta: number[] = [];
  private dragDelta: { mx: number, my: number }[][] = [];
  private panDelta: { mx: number, my: number }[] = [];
  private previousTouch: (TouchEvent | null)[] = [];

  currentStepModel: StepModel;
  instructionModel: InstructionModel;

  private canvas!: HTMLCanvasElement;
  private instructionWrapper!: HTMLDivElement;
  private contentWrapper!: HTMLDivElement;
  private mainContent!: HTMLDivElement;
  private partListContent!: HTMLDivElement;

  private mainScene: Scene = new Scene(); //TODO put into list below as first element or so
  private partListScenes: Scene[] = []; //make list with not active scenes -> not active if mouse not over
  private mainCamera: OrthographicCamera = new OrthographicCamera(); //TODO put into scene
  private cameraCoordinates: Spherical = new Spherical(1, 1, 2.6); //TODO put into scene
  private partListCameraCoordinates: Spherical[] = []; //TODO put into scene
  private renderer!: WebGLRenderer;
  private target: Vector3 = new Vector3(0, 0, 0);

  readonly clock: Clock = new Clock();
  readonly MAX_FPS: number = 1 / 60;

  cameraZoomSpeed: number = 0.0005;
  partListCameraZoomSpeed: number = 0.0005;
  cameraMaxZoom: number = 0.05;
  partListMaxCameraZoom: number = 0.05;
  cameraMinZoom: number = 1000;
  partListMinCameraZoom: number = 1000;
  cameraRotationSpeed: number = 0.01;
  partListCameraRotationSpeed: number = 0.02;

  panningSpeed: number = 50; //high -> faster
  resetTargetOnPageChange: boolean = true;

  enableAutoZoom: boolean = true;
  enableAutoRotation: boolean = true;
  minimalAutoZoom: number = 4; //high -> further away
  partListMinimalAutoZoom: number = 7; //high -> further away
  autoZoomFactor: number = 1.7; //high -> further away
  partListAutoZoomFactor: number = 1.1; //high -> further away

  defaultCameraCoordinates: Spherical = new Spherical(1, 1, 2.6);
  defaultPartListCameraCoordinates: Spherical = new Spherical(1, 1, 1);

  constructor(private location: Location, private instructionService: InstructionService, private route: ActivatedRoute, private mocGrabberService: MocGrabberService, private metaService: MetaServiceService) {
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
      let initialStep = (Number(paramMap.get('stepIndex')) || 0);
      if (moc && file && file.instructions) {
        //this.metaService.setDefaultTags(file.name+ " Online Instructions",window.location.href);
        this.file = file;
        this.version = version;
        this.loadingFinished = false;
        this.instructionModel = await this.instructionService.getInstructionModel(file.link, file.instructions);
        this.currentStepNumber = initialStep;
        this.collectElementReferences();
        this.createRenderer();
        this.createMainScene();
        this.refreshStep();
        this.registerWindowListeners();
        this.startRenderLoop();
      }
    });
  }

  ngOnDestroy(): void {
    this.renderingActive = false;
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }

  private collectElementReferences(): void {
    this.canvas = document.getElementById('canvas-viewer')! as HTMLCanvasElement;
    this.instructionWrapper = document.getElementById('instruction-wrapper')! as HTMLDivElement;
    this.contentWrapper = document.getElementById("content") as HTMLDivElement;
    this.mainContent = document.getElementById("main-content") as HTMLDivElement;
    this.partListContent = document.getElementById("partlist-content") as HTMLDivElement;
  }

  private registerListeners(htmlElement: HTMLElement, htmlElementIndex: number, enablePan: boolean) {
    htmlElement.addEventListener('mousedown', event => {
      if (event.button === 0)
        this.isDragging[htmlElementIndex] = true;
      else if (event.button === 2 && enablePan)
        this.isPanning = true;
    });
    htmlElement.addEventListener('touchstart', event => {
      if (event.touches.length === 1)
        this.isDragging[htmlElementIndex] = true;
      /*else if (event.touches.length === 2)
        this.isPanning = true;*/
    });
    htmlElement.addEventListener('mouseup', event => {
      if (event.button === 0)
        this.isDragging[htmlElementIndex] = false;
      else if (event.button === 2 && enablePan)
        this.isPanning = false;
    });
    htmlElement.addEventListener('touchend', () => {
      const prevTouch = this.previousTouch[htmlElementIndex];
      if (prevTouch) {
        if (prevTouch.touches.length === 1) {
          this.isDragging[htmlElementIndex] = false;
          this.previousTouch[htmlElementIndex] = null;
        } /*else if (this.previousTouch.touches.length === 2) {
          this.isPanning = false;
          if (event.touches.length === 0) {
            this.isDragging = false;
            this.previousTouch = undefined;
          } else
            this.previousTouch = event;
        }*/
      }
    });
    htmlElement.addEventListener('touchcancel', () => {
      const prevTouch = this.previousTouch[htmlElementIndex];
      if (prevTouch) {
        if (prevTouch.touches.length === 1) {
          this.isDragging[htmlElementIndex] = false;
          this.previousTouch[htmlElementIndex] = null;
        } /*else if (this.previousTouch.touches.length === 2) {
          this.isPanning = false;
          if (event.touches.length === 0) {
            this.isDragging = false;
            this.previousTouch = undefined;
          } else
            this.previousTouch = event;
        }*/
      }
    });
    htmlElement.addEventListener('wheel', event => {
      event.preventDefault();
      this.scrollDelta[htmlElementIndex] += event.deltaY;
    });
    htmlElement.addEventListener('mousemove', event => {
      if (this.isDragging[htmlElementIndex])
        this.dragDelta[htmlElementIndex].push({mx: event.movementX, my: event.movementY});
      if (this.isPanning && enablePan)
        this.panDelta.push({mx: event.movementX, my: event.movementY});
    });
    htmlElement.addEventListener('touchmove', event => {
      const prevTouch = this.previousTouch[htmlElementIndex];
      if (prevTouch) {
        if (event.touches.length === 1) { //rotation
          const deltaX = event.touches[0].clientX - prevTouch.touches[0].clientX;
          const deltaY = event.touches[0].clientY - prevTouch.touches[0].clientY;
          this.dragDelta[htmlElementIndex].push({mx: deltaX, my: deltaY});
        }/* else if (event.touches.length === 2) { //pan or zoom
          const prevDistance = Math.sqrt((this.previousTouch.touches[1].clientX - this.previousTouch.touches[0].clientX) ^ 2 + (this.previousTouch.touches[1].clientY - this.previousTouch.touches[0].clientY) ^ 2);
          const newDistance = Math.sqrt((event.touches[1].clientX - event.touches[0].clientX) ^ 2 + (event.touches[1].clientY - event.touches[0].clientY) ^ 2);

          if (prevDistance - newDistance != 0) //zoom //add smal lepsilon?
            this.scrollDelta += prevDistance - newDistance;

          //pan
          const touch0PositionChange = Math.sqrt((event.touches[0].clientX - this.previousTouch.touches[0].clientX) ^ 2 + (event.touches[0].clientY - this.previousTouch.touches[0].clientY) ^ 2);
          const touch1PositionChange = Math.sqrt((event.touches[1].clientX - this.previousTouch.touches[1].clientX) ^ 2 + (event.touches[1].clientY - this.previousTouch.touches[1].clientY) ^ 2);
          const avgTouchPositionChange = (touch0PositionChange + touch1PositionChange) / 2;
          if (avgTouchPositionChange > 0) {
            const avgXChange = ((event.touches[0].clientX - this.previousTouch.touches[0].clientX) + (event.touches[1].clientX - this.previousTouch.touches[1].clientX)) / 2;
            const avgYChange = ((event.touches[0].clientY - this.previousTouch.touches[0].clientY) + (event.touches[1].clientY - this.previousTouch.touches[1].clientY)) / 2;

            this.panDelta.push({mx: avgXChange, my: avgYChange});
          }
        }*/
      }
      this.previousTouch[htmlElementIndex] = event;
    });
  }

  private registerWindowListeners() {
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
    window.addEventListener('resize', () => {
      this.canvas.style.width = this.contentWrapper.clientWidth + "px";
      this.canvas.style.height = this.contentWrapper.clientHeight + "px"; //TODO
      this.renderer.setSize(this.contentWrapper.clientWidth, this.contentWrapper.clientHeight);

      if (this.enableAutoZoom && this.currentStepNumber > 0 && this.currentStepNumber <= this.instructionModel.instructionSteps.length) {
        this.adjustCameraToModel(this.currentStepModel.newPartsModel, this.mainCamera, this.mainContent, this.autoZoomFactor, this.minimalAutoZoom);
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
      const panSpeed = 1 / camera.zoom / this.panningSpeed;
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

    //if it's not a page with the normal model in it then skip it
    if (this.currentStepNumber > this.instructionModel.instructionSteps.length || this.currentStepNumber <= 0) return;

    //fetch new step
    this.currentStepModel = this.instructionService.getModelByStep(this.instructionModel, this.currentStepNumber - 1);
    this.currentSubmodelAmount = this.currentStepModel.parentSubmodelAmount;

    //create the divs and scenes for the new parts of the part list
    this.updatePartListScenes();

    //initialize the lists n stuff for the camera control
    this.initializeControlBuffers();

    this.instructionWrapper.style.height = this.contentWrapper.clientHeight + "px";
    this.canvas.style.height = this.contentWrapper.clientHeight + "px";
    this.renderer.setSize(this.contentWrapper.clientWidth, this.contentWrapper.clientHeight);

    this.updateMainScene();
  }

  private initializeControlBuffers(): void {
    this.dragDelta = [];
    this.isDragging = [];
    this.scrollDelta = [];
    this.previousTouch = [];
    for (let i = 0; i <= this.currentStepModel.stepPartsList.length; i++) {
      this.dragDelta.push([]);
      this.isDragging.push(false);
      this.scrollDelta.push(0);
      this.previousTouch.push(null);
    }
  }

  private adjustCameraToModel(model: Group, camera: OrthographicCamera, htmlElement: HTMLElement, defaultZoomFactor: number, minimalZoom: number): void {
    camera.updateMatrixWorld();
    const box = new Box3().setFromObject(model);
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
    const cameraBox: Box3 = new Box3().setFromPoints(boxPoints);
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
  }

  private createRenderer():void{
    this.renderer = new WebGLRenderer({antialias: true, canvas: this.canvas});
    this.renderer.setPixelRatio(window.devicePixelRatio * 1.5); //TODO remove 1.5?
    this.renderer.setClearColor("rgb(88,101,117)");
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

  private createMainScene(): void {
    const scene = this.createDefaultScene();
    this.mainScene = scene;

    const camera = new OrthographicCamera(this.mainContent.clientWidth / -2, this.mainContent.clientWidth / 2, this.mainContent.clientHeight / 2, this.mainContent.clientHeight / -2, -1000, 1000);
    scene.add(camera);
    this.mainCamera = camera;

    scene.userData['element'] = this.mainContent;
    scene.userData['camera'] = camera;

    this.registerListeners(this.mainContent, 0, true);
  }

  private updateMainScene(): void {
    //change the view for the main canvas from here on
    if (this.enableAutoRotation) {
      //reset camera rotation
      this.cameraCoordinates = this.defaultCameraCoordinates.clone();

      //reset camera target
      if (this.resetTargetOnPageChange)
        this.target = new Vector3(0, 0, 0);

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
        if (directionVector.dot(new Vector3(0, 0, -1)) < -0.01) { //new parts are behind -> rotate on y-axis by pi
          this.cameraCoordinates.theta += Math.PI;
          if (directionVector.dot(new Vector3(-1, 0, 0)) < -0.01) //new parts are on the right side -> flip a little
            this.cameraCoordinates.theta = -this.cameraCoordinates.theta;
        } else if (directionVector.dot(new Vector3(1, 0, 0)) < -0.01) //new parts are on the right side -> flip a little
          this.cameraCoordinates.theta = -this.cameraCoordinates.theta;

      }
    }

    //center the parts onto the center of newPartsModel
    const newPartsBox = new Box3().setFromObject(this.currentStepModel.newPartsModel);
    newPartsBox.getCenter(this.currentStepModel.prevPartsModel.position).multiplyScalar(-1);
    newPartsBox.getCenter(this.currentStepModel.newPartsModel.position).multiplyScalar(-1);

    //this.scene.add(new Box3Helper(new Box3().setFromObject(this.currentStepModel.newPartsModel),new Color(1,0,0)),new Box3Helper(new Box3().setFromObject(this.currentStepModel.prevPartsModel),new Color(0,1,0)));

    if (this.enableAutoZoom && this.currentStepNumber > 0 && this.currentStepNumber <= this.instructionModel.instructionSteps.length) {
      this.adjustCameraToModel(this.currentStepModel.newPartsModel, this.mainCamera, this.mainContent, this.autoZoomFactor, this.minimalAutoZoom);
    }

    this.mainScene.add(this.currentStepModel.newPartsModel, this.currentStepModel.prevPartsModel);
  }

  private updatePartListScenes(): void {
    for (let i = 0; i < this.currentStepModel.stepPartsList.length; i++) { //TODO sort parts by size beforehand

      const stepPart: StepPart = this.currentStepModel.stepPartsList[i];

      const partDiv: HTMLDivElement = document.createElement('div'); //TODO add hover effect
      partDiv.className = 'partlist-element';
      partDiv.id = "partlist-element-" + i;
      partDiv.style.margin = '5px';
      const sceneDiv: HTMLDivElement = document.createElement('div');
      sceneDiv.id = "partlist-element-scene-" + i;
      sceneDiv.style.touchAction = 'none';
      sceneDiv.style.height = '6rem';
      sceneDiv.style.width = '6rem';
      const amountDiv: HTMLDivElement = document.createElement('div');
      amountDiv.innerText = stepPart.quantity + 'x';
      partDiv.appendChild(sceneDiv);
      partDiv.appendChild(amountDiv);
      this.partListContent.appendChild(partDiv);

      this.registerListeners(sceneDiv, i + 1, false);

      const scene = this.createDefaultScene();
      const partGroup: Group = stepPart.model.clone();

      scene.add(partGroup);
      partGroup.rotateX(Math.PI);
      partGroup.rotateY(-Math.PI / 2);
      new Box3().setFromObject(partGroup).getCenter(partGroup.position).multiplyScalar(-1);

      const camera = new OrthographicCamera(sceneDiv.clientWidth / -2, sceneDiv.clientWidth / 2, sceneDiv.clientHeight / 2, sceneDiv.clientHeight / -2, -1000, 1000);
      const cameraCoordinates = this.defaultPartListCameraCoordinates.clone();
      this.partListCameraCoordinates[i] = cameraCoordinates;
      camera.position.setFromSpherical(cameraCoordinates);
      camera.lookAt(0, 0, 0);
      scene.add(camera);
      this.adjustCameraToModel(partGroup, camera, sceneDiv, this.partListAutoZoomFactor, this.partListMinimalAutoZoom);

      scene.userData["element"] = sceneDiv;
      scene.userData["camera"] = camera;
      this.partListScenes.push(scene);
    }
  }

  private clearScenes() {
    //clear main scene
    if (this.currentStepModel.newPartsModel)
      this.mainScene.remove(this.currentStepModel.newPartsModel);
    if (this.currentStepModel.prevPartsModel)
      this.mainScene.remove(this.currentStepModel.prevPartsModel);

    //clear part list divs
    while (this.partListContent.hasChildNodes() && this.partListContent.lastChild)
      this.partListContent.removeChild(this.partListContent.lastChild);
    this.partListScenes = [];
    this.partListCameraCoordinates = [];
  }

  private startRenderLoop() {

    this.loadingFinished = true;
    this.renderingActive = true;

    this.renderer.setSize(this.contentWrapper.clientWidth, this.contentWrapper.clientHeight);

    //update main controls once TODO remove
    this.updateControls(this.mainCamera, this.target, this.cameraCoordinates, 0, true,
      this.cameraZoomSpeed, this.cameraMinZoom, this.cameraMaxZoom, this.cameraRotationSpeed);

    const update = () => {
      if (this.clock.getElapsedTime() > this.MAX_FPS) {
        this.clock.start();

        this.updateControls(this.mainCamera, this.target, this.cameraCoordinates, 0, true,
          this.cameraZoomSpeed, this.cameraMinZoom, this.cameraMaxZoom, this.cameraRotationSpeed);

        //render main scene
        const scene = this.mainScene;
        const element: HTMLDivElement = scene.userData["element"];
        const camera: OrthographicCamera = scene.userData["camera"];
        // get its position relative to the page's viewport
        const rectElement = element.getBoundingClientRect();
        const rectCanvas = this.canvas.getBoundingClientRect();

        this.renderer.setViewport(0, 0, rectElement.width, rectElement.height);
        this.renderer.setScissor(0, 0, rectElement.width, rectElement.height);
        this.renderer.clearColor();
        this.renderer.clearDepth();

        this.renderer.setViewport(0, rectCanvas.bottom - rectElement.bottom, rectElement.width, rectElement.height);
        this.renderer.setScissor(0, rectCanvas.bottom - rectElement.bottom, rectElement.width, rectElement.height);
        this.renderer.render(scene, camera);

        //render partList n stuff
        for (let i = 0; i < this.partListScenes.length; i++) {
          const partListScene = this.partListScenes[i];
          const partListElement: HTMLDivElement = partListScene.userData["element"];
          const partListCamera: OrthographicCamera = partListScene.userData["camera"];

          // get its position relative to the page's viewport
          const rectPartlistElement = partListElement.getBoundingClientRect();
          const left = rectPartlistElement.left - rectCanvas.left;
          const top = rectCanvas.bottom - rectPartlistElement.bottom;

          this.updateControls(partListCamera, new Vector3(0, 0, 0), this.partListCameraCoordinates[i], i + 1, false,
            this.partListCameraZoomSpeed, this.partListMinCameraZoom, this.partListMaxCameraZoom, this.partListCameraRotationSpeed);

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
