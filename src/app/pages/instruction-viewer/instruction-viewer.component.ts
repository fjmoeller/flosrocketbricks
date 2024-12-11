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
  private renderer?: WebGLRenderer;
  private cameraCoordinates: Spherical = new Spherical(1, 1, 2.6);
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

  previousTouch?: TouchEvent;

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
      if (file && file.instructions) {
        this.file = file;
        this.version = version;
        this.loadingFinished = false;
        this.instructionModel = await this.instructionService.getInstructionModel(file.link, file.instructions);
        this.createScene();
        this.currentStepNumber = initialStep;
        this.refreshStep(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.renderingActive = false;
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }

  private registerListeners(canvas: HTMLElement) {
    canvas.addEventListener('mousedown', event => {
      if (event.button === 0)
        this.isDragging = true;
      else if (event.button === 2)
        this.isPanning = true;
    });
    canvas.addEventListener('touchstart', event => {
      if (event.touches.length === 1)
        this.isDragging = true;
      /*else if (event.touches.length === 2)
        this.isPanning = true;*/
    });
    canvas.addEventListener('mouseup', event => {
      if (event.button === 0)
        this.isDragging = false;
      else if (event.button === 2)
        this.isPanning = false;
    });
    canvas.addEventListener('touchend', () => {
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
    canvas.addEventListener('touchcancel', () => {
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
    canvas.addEventListener('touchmove', event => {
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

    this.renderer = new WebGLRenderer({antialias: true, canvas: canvas});
    this.renderer.setSize(this.canvasSize.width, this.canvasSize.height);
    this.renderer.setPixelRatio(window.devicePixelRatio * 1.5);
    this.renderer.setClearColor("rgb(88,101,117)");

    window.addEventListener('resize', () => {
      this.renderer?.setSize(canvasWrapper.clientWidth, canvasWrapper.clientHeight);
      this.renderer?.render(newScene, camera);

      const prevAspectRatio: number = camera.right / camera.top;
      const newAspectRatio: number = canvasWrapper.clientWidth / canvasWrapper.clientHeight;
      camera.top = camera.top / (newAspectRatio / prevAspectRatio);
      camera.bottom = camera.bottom / (newAspectRatio / prevAspectRatio);
      camera.updateProjectionMatrix();

      this.canvasSize.width = canvasWrapper.clientWidth;
      this.canvasSize.height = canvasWrapper.clientHeight;
    });

    const update = () => {
      if (this.clock.getElapsedTime() > this.MAX_FPS) {
        this.updateControls();

        this.renderer?.render(newScene, camera);

        this.clock.start()
      }
      if (this.renderingActive)
        window.requestAnimationFrame(update);
    };

    this.updateControls();
    this.renderer.render(newScene, camera);

    this.loadingFinished = true;
    this.renderingActive = true;

    update();
  }
}
