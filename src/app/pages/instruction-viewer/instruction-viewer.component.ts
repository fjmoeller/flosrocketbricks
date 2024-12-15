import {AfterViewInit, Component, Inject, OnDestroy, OnInit, PLATFORM_ID} from '@angular/core';
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
import {InstructionModel, InstructionPart, InstructionSubmodel, StepModel} from "../../model/instructions";
import {InstructionService} from "../../services/file/instruction.service";
import {LdrPart} from "../../model/ldrawParts";
import {ActivatedRoute} from "@angular/router";
import {MocGrabberService} from "../../services/grabber/moc-grabber.service";
import {Box3} from "three/src/math/Box3.js";
import {File, Moc, Version} from "../../model/classes";
import {MetaServiceService} from "../../services/meta-service.service";
import {isPlatformBrowser} from "@angular/common";

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

  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private scrollDelta: number = 0;
  private dragDelta: { mx: number, my: number }[] = [];
  private panDelta: { mx: number, my: number }[] = [];

  currentStepModel: StepModel;
  instructionModel: InstructionModel;

  private canvas!: HTMLCanvasElement;
  private canvasWrapper!: HTMLDivElement;
  private contentWrapper!: HTMLDivElement;
  private mainContent!: HTMLDivElement;
  private partlistContent!: HTMLDivElement;

  private mainScene: Scene = new Scene(); //TODO put into list below as first element or so
  private partListScenes: Scene[] = []; //make list with not active scenes -> not active if mouse not over
  private mainCamera: OrthographicCamera = new OrthographicCamera(); //TODO put into scene
  private partListCameras: OrthographicCamera[] = []; //TODO put into scene
  private cameraCoordinates: Spherical = new Spherical(1, 1, 2.6); //TODO put into scene
  private partListCameraCoordinates: Spherical[] = []; //TODO put into scene
  private renderer!: WebGLRenderer;
  private target: Vector3 = new Vector3(0, 0, 0);

  readonly clock: Clock = new Clock();
  readonly MAX_FPS: number = 1 / 60;

  zoomSpeed: number = 0.0005;
  resetTargetOnPageChange: boolean = true;
  minimalZoom: number = 7;
  maxCameraZoom: number = 0.05;
  minCameraZoom: number = 1000;
  rotationSpeed: number = 0.01;
  defaultZoomFactor: number = 2;
  panningSpeed: number = 50;
  enableAutoZoom: boolean = true;
  enableAutoRotation: boolean = true;
  defaultCameraCoordinates: Spherical = new Spherical(1, 1, 2.6);

  previousTouch?: TouchEvent;

  constructor(@Inject(PLATFORM_ID) private platformId: any, private instructionService: InstructionService, private route: ActivatedRoute, private mocGrabberService: MocGrabberService, private metaService: MetaServiceService) {
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
      let initialStep = (Number(paramMap.get('stepIndex')) || 0); //TODO change back to 0
      if (moc && file && file.instructions) {
        //this.metaService.setDefaultTags(file.name+ " Online Instructions",window.location.href);
        this.file = file;
        this.version = version;
        this.loadingFinished = false;
        this.instructionModel = await this.instructionService.getInstructionModel(file.link, file.instructions);
        this.currentStepNumber = initialStep;
        this.collectElementReferences();
        this.createMainScene();
        this.refreshStep(false); //TODO maybe move to afterviewinit?
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
    this.canvasWrapper = document.getElementById('canvas-wrapper')! as HTMLDivElement;
    this.contentWrapper = document.getElementById("content") as HTMLDivElement;
    this.mainContent = document.getElementById("main-content") as HTMLDivElement;
    this.partlistContent = document.getElementById("partlist-content") as HTMLDivElement;
  }

  private registerListeners(htmlElement: HTMLElement) {
    htmlElement.addEventListener('mousedown', event => {
      if (event.button === 0)
        this.isDragging = true;
      else if (event.button === 2)
        this.isPanning = true;
    });
    htmlElement.addEventListener('touchstart', event => {
      if (event.touches.length === 1)
        this.isDragging = true;
      /*else if (event.touches.length === 2)
        this.isPanning = true;*/
    });
    htmlElement.addEventListener('mouseup', event => {
      if (event.button === 0)
        this.isDragging = false;
      else if (event.button === 2)
        this.isPanning = false;
    });
    htmlElement.addEventListener('touchend', () => {
      if (this.previousTouch) {
        if (this.previousTouch.touches.length === 1) {
          this.isDragging = false;
          this.previousTouch = undefined;
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
      if (this.previousTouch) {
        if (this.previousTouch.touches.length === 1) {
          this.isDragging = false;
          this.previousTouch = undefined;
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
      this.scrollDelta += event.deltaY;
    });
    htmlElement.addEventListener('mousemove', event => {
      if (this.isDragging)
        this.dragDelta.push({mx: event.movementX, my: event.movementY});
      if (this.isPanning)
        this.panDelta.push({mx: event.movementX, my: event.movementY});
    });
    htmlElement.addEventListener('touchmove', event => {
      if (this.previousTouch) {
        if (event.touches.length === 1) { //rotation
          const deltaX = event.touches[0].clientX - this.previousTouch.touches[0].clientX;
          const deltaY = event.touches[0].clientY - this.previousTouch.touches[0].clientY;
          this.dragDelta.push({mx: deltaX, my: deltaY});
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
      this.previousTouch = event;
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
    window.addEventListener('resize', () => {
      this.renderer?.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
      //TODO update main camera
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

  //TODO also update for non mainScene things and change the panDelta and scrollDelta params so that i dont have to set them to 0 after callign this fucntion
  private updateControls(camera: OrthographicCamera, cameraTarget: Vector3, cameraCoordinates: Spherical, scrollDelta: number, panDelta: {mx:number,my:number}[], dragDelta:{mx:number,my:number}[]): void {
    //zooming in
    camera.zoom = Math.max(Math.min(camera.zoom - (scrollDelta * this.zoomSpeed), this.minCameraZoom), this.maxCameraZoom);

    //panning
    const panSpeed = 1 / camera.zoom / this.panningSpeed;
    let panningDeltaX: number = 0;
    let panningDeltaY: number = 0;
    for (let i = 0; i < panDelta.length; i++) {
      panningDeltaX -= panDelta[i].mx;
      panningDeltaY += panDelta[i].my;
    }
    panDelta = [];
    cameraTarget.add(new Vector3(panningDeltaX * panSpeed, panningDeltaY * panSpeed, 0).applyMatrix3(new Matrix3().getNormalMatrix(camera.matrix)))

    //rotating & position
    let draggingDeltaX: number = 0;
    let draggingDeltaY: number = 0;
    for (let i = 0; i < dragDelta.length; i++) {
      draggingDeltaX += dragDelta[i].mx;
      draggingDeltaY += dragDelta[i].my;
    }
    dragDelta = [];
    cameraCoordinates.theta -= draggingDeltaX * this.rotationSpeed;
    cameraCoordinates.phi -= draggingDeltaY * this.rotationSpeed;
    // no camera flipping
    cameraCoordinates.phi = Math.max(0.05, Math.min(Math.PI - 0.05, cameraCoordinates.phi));
    camera.position.setFromSpherical(cameraCoordinates).add(cameraTarget);
    camera.lookAt(cameraTarget);

    camera.updateProjectionMatrix();
  }

  private refreshStep(notFirstCall: boolean): void {
    if (notFirstCall)
      this.mainScene.remove(this.currentStepModel.newPartsModel, this.currentStepModel.prevPartsModel);

    this.clearPartListElements();

    //if it's not a page with the normal model in it
    /**if (this.currentStepNumber > this.instructionModel.instructionSteps.length || this.currentStepNumber <= 0)
     return;*/ //TODO add back in when we have a next step thing


    this.currentStepModel = this.instructionService.getModelByStep(this.instructionModel, this.currentStepNumber - 1);
    this.currentSubmodelAmount = this.currentStepModel.parentSubmodelAmount;

    //partList
    this.createPartListScenes();

    this.canvasWrapper.style.height = "" + document.getElementById('content')!.clientHeight + "px";

    //main
    if (this.enableAutoRotation) {
      //reset camera rotation
      this.cameraCoordinates = new Spherical(1, 1, 2.6);

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

    if ((this.enableAutoZoom || !notFirstCall)) {
      const box = new Box3().setFromObject(this.currentStepModel.newPartsModel);
      const boxPoints = [
        new Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(this.mainCamera.matrixWorld),
        new Vector3(box.min.x, box.min.y, box.max.z).applyMatrix4(this.mainCamera.matrixWorld),
        new Vector3(box.min.x, box.max.y, box.min.z).applyMatrix4(this.mainCamera.matrixWorld),
        new Vector3(box.min.x, box.max.y, box.max.z).applyMatrix4(this.mainCamera.matrixWorld),
        new Vector3(box.max.x, box.min.y, box.min.z).applyMatrix4(this.mainCamera.matrixWorld),
        new Vector3(box.max.x, box.min.y, box.max.z).applyMatrix4(this.mainCamera.matrixWorld),
        new Vector3(box.max.x, box.max.y, box.min.z).applyMatrix4(this.mainCamera.matrixWorld),
        new Vector3(box.max.x, box.max.y, box.max.z).applyMatrix4(this.mainCamera.matrixWorld),
      ];
      const cameraBox: Box3 = new Box3().setFromPoints(boxPoints);
      const modelWidth: number = cameraBox.max.x - cameraBox.min.x;
      const modelHeight: number = cameraBox.max.y - cameraBox.min.y;
      const modelAspectRatio: number = modelWidth / modelHeight;
      //const canvasAspectRatio: number = this.mainContent.clientWidth / this.mainContent.clientHeight; TODO this somehow doesnt work idk why
      const canvasAspectRatio: number = this.canvas.clientWidth / this.canvas.clientHeight;
      //console.log(this.mainContent.clientWidth,this.mainContent.clientHeight);

      if (modelAspectRatio > canvasAspectRatio) { //if the model is wider than the canvas (in terms of aspect ratio)
        this.mainCamera.left = -modelWidth / 2 * this.defaultZoomFactor;
        this.mainCamera.right = modelWidth / 2 * this.defaultZoomFactor;
        this.mainCamera.bottom = (-modelWidth / 2 / canvasAspectRatio) * this.defaultZoomFactor;
        this.mainCamera.top = (modelWidth / 2 / canvasAspectRatio) * this.defaultZoomFactor;
      } else { //if the model is taller than the canvas (in terms of aspect ratio)
        this.mainCamera.left = (-modelHeight / 2 * canvasAspectRatio) * this.defaultZoomFactor;
        this.mainCamera.right = (modelHeight / 2 * canvasAspectRatio) * this.defaultZoomFactor;
        this.mainCamera.bottom = -modelHeight / 2 * this.defaultZoomFactor;
        this.mainCamera.top = modelHeight / 2 * this.defaultZoomFactor;
      }
      //expect a minimum size of the canvas
      if (this.mainCamera.right < this.minimalZoom || this.mainCamera.top < this.minimalZoom) {
        this.mainCamera.left = -this.minimalZoom * canvasAspectRatio;
        this.mainCamera.right = this.minimalZoom * canvasAspectRatio;
        this.mainCamera.bottom = -this.minimalZoom;
        this.mainCamera.top = this.minimalZoom;
      }
      this.mainCamera.zoom = 1;
      this.mainCamera.updateProjectionMatrix();
    }
    this.mainScene.add(this.currentStepModel.newPartsModel, this.currentStepModel.prevPartsModel);
  }

  createDefaultScene(): Scene {
    const newScene = new Scene();
    //TODO remove
    //const axesHelper = new AxesHelper(10);
    //this.scene.add(axesHelper);

    const pointLight = new DirectionalLight(0xffffff, 0.5);
    pointLight.position.set(100, 100, -100);
    newScene.add(pointLight);
    const pointLight2 = new DirectionalLight(0xffffff, 0.5);
    pointLight2.position.set(-100, -100, 100);
    newScene.add(pointLight2);
    const ambientLight = new AmbientLight(0xffffff, 0.8);
    newScene.add(ambientLight);

    return newScene;
  }

  createMainScene(): void {
    const scene = this.createDefaultScene();
    this.mainScene = scene;

    const camera = new OrthographicCamera(this.mainContent.clientWidth / -2, this.mainContent.clientWidth / 2, this.mainContent.clientHeight / 2, this.mainContent.clientHeight / -2, -1000, 1000);
    scene.add(camera);
    this.mainCamera = camera;

    scene.userData['element'] = this.mainContent;
    scene.userData['camera'] = camera;
  }

  createPartListScenes(): void {
    const partListDiv = document.getElementById("partlist-content");

    for (let i = 0; i < this.currentStepModel.stepPartsList.length; i++) { //TODO sort parts by size beforehand
      const scene = this.createDefaultScene();

      const stepPart = this.currentStepModel.stepPartsList[i];
      scene.add(stepPart.model);

      const partDiv: HTMLDivElement = document.createElement('div'); //TODO add hover effect
      partDiv.className = 'partlist-element';
      partDiv.style.height = '6rem';
      partDiv.style.width = '6rem';
      //partDiv.id = "partlist-element-"+i;
      const sceneDiv: HTMLDivElement = document.createElement('div');
      //sceneDiv.id = "partlist-element-scene-"+i;
      const amountDiv: HTMLDivElement = document.createElement('div');
      amountDiv.innerText = stepPart.quantity + 'x'; //TODO increase text size
      partDiv.appendChild(sceneDiv); //TODO add class maybe?
      partDiv.appendChild(amountDiv);
      partListDiv?.appendChild(partDiv);

      const camera = new OrthographicCamera(sceneDiv.clientWidth / -2, sceneDiv.clientWidth / 2, sceneDiv.clientHeight / 2, sceneDiv.clientHeight / -2, -1000, 1000);
      camera.position.setFromSpherical(this.defaultCameraCoordinates.clone());
      camera.lookAt(0, 0, 0);
      scene.add(camera);
      this.partListCameras.push(camera);

      //TODO add camera size determination

      scene.userData['element'] = sceneDiv;
      scene.userData['camera'] = camera;
      this.partListScenes.push(scene);
    }
  }

  private clearPartListElements() {
    const partListDiv = document.getElementById("partlist-content");
    while (partListDiv?.hasChildNodes() && partListDiv.lastChild)
      partListDiv.removeChild(partListDiv.lastChild);

    this.partListCameras = [];
    this.partListScenes = [];
    this.partListCameraCoordinates = [];
  }

  private startRenderLoop() {
    this.registerListeners(this.contentWrapper);

    this.loadingFinished = true;
    this.renderingActive = true;

    const update = () => {
      if (this.clock.getElapsedTime() > this.MAX_FPS) {
        this.clock.start();

        this.updateControls(this.mainCamera,this.target,this.cameraCoordinates,this.scrollDelta,this.panDelta,this.dragDelta);
        this.scrollDelta = 0;
        this.panDelta = [];
        this.dragDelta = [];

        //render main scene
        const scene = this.mainScene;
        const element: HTMLDivElement = scene.userData["element"];
        const camera: OrthographicCamera = scene.userData["camera"];
        // get its position relative to the page's viewport
        const rect = element.getBoundingClientRect();
        const canvasrect = this.canvas.getBoundingClientRect();
        rect.x -= canvasrect.x;
        // set the viewport
        const width = rect.right - rect.left;
        const height = rect.bottom - rect.top;
        const left = rect.left;
        const bottom = this.canvas.clientHeight - rect.bottom;
        this.renderer.setViewport(left, bottom, width, height);
        this.renderer.setScissor(left, bottom, width, height);
        this.renderer.render(scene, camera);

        //render partList n stuff
        for (let i = 0; i < this.partListScenes.length; i++) {
          const scene = this.partListScenes[i];
          const element: HTMLDivElement = scene.userData["element"];
          const camera: OrthographicCamera = scene.userData["camera"];

          // get its position relative to the page's viewport
          const rect = element.getBoundingClientRect();
          // skip if offscreen
          if (rect.bottom < 0 || rect.top > this.renderer?.domElement.clientHeight ||
            rect.right < 0 || rect.left > this.renderer.domElement.clientWidth)
            continue;

          //this.updateControls(this.mainCamera,this.target,this.cameraCoordinates,this.scrollDelta,this.panDelta,this.dragDelta); TODO add for the parts

          // set the viewport
          const width = rect.right - rect.left;
          const height = rect.bottom - rect.top;
          const left = rect.left;
          const bottom = this.renderer.domElement.clientHeight - rect.bottom;
          this.renderer.setViewport(left, bottom, width, height);
          this.renderer.setScissor(left, bottom, width, height);
          this.renderer.render(scene, camera);
        }
      }
      if (this.renderingActive)
        window.requestAnimationFrame(update);
    };

    this.renderer = new WebGLRenderer({antialias: true, canvas: this.canvas});
    this.renderer.setSize(this.canvas.width, this.canvas.height, false);
    this.renderer.setPixelRatio(window.devicePixelRatio * 1.5); //TODO remove 1.5
    this.renderer.setClearColor("rgb(88,101,117)");

    this.updateControls(this.mainCamera,this.target,this.cameraCoordinates,this.scrollDelta,this.panDelta,this.dragDelta);
    this.scrollDelta = 0;
    this.panDelta = [];
    this.dragDelta = [];

    update();
  }
}
