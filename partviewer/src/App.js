import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import  * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AppConfig } from './AppConfig.js';


class App {

	init() {
		this.config = new AppConfig();
		this.config.load(() => {
			this.onAppConfigLoaded();
		});
		this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
	
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0xffffff );

		this.create_material();
		this.create_Axes();

		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( this.renderer.domElement );

		window.addEventListener( 'resize', onWindowResize, false );

		this.controls = new OrbitControls( this.camera, this.renderer.domElement );

		this.createGUI();
		animate();
	}

	onAppConfigLoaded() {
		console.log(this.config.data);
	}

	create_material() {
		this.material = new THREE.MeshBasicMaterial( {
			color: 0xffffff,
			polygonOffset: true,
			polygonOffsetFactor: 0.5, // positive value pushes polygon further away
			polygonOffsetUnits: 1
		} );
	}

	create_Axes() {
		this.axesHelper = new THREE.AxesHelper(5);
		this.axesHelper.l
		this.scene.add(this.axesHelper);
	}

	createEdges(parentObject3D, geometry) {
		// add lines for the edges
		const geo = new THREE.EdgesGeometry(geometry,1); 
		// not Wireframe because that gives lots of extra lines ....
	//	const geo = new WireframeGeometry(geometry); // or WireframeGeometry( geometry )?
		const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });

		const wireframe = new THREE.LineSegments(geo, mat);
		parentObject3D.add(wireframe);
	}

	activateModel() {
		if (this.config.isLoaded === true) {
			const url = this.config.data.PartURL + '/'  + 
						this.config.data.gltfDir + '/'  + 
						this.guiState.partID     + '.gltf';
			this.main_object = this.loadModel(url);
			this.scene.add(this.main_object);
		}
	}

	loadModel(url) {
		const loaded_model = new THREE.Object3D();
		
		// todo make member variable for reuse
		const loader = new GLTFLoader();
		loader.load( url, ( gltf ) => {
			// TODO cleanup and add loading progress bar
			const tmpGeomArray = [];
			gltf.scene.traverse( (child) => {
				if (child.isMesh) {
					tmpGeomArray.push(child.geometry);
				}
			} );
			const geometry = BufferGeometryUtils.mergeBufferGeometries(tmpGeomArray,false);
			const mesh = new THREE.Mesh(geometry, this.material);
			loaded_model.add(mesh);
			this.createEdges(loaded_model ,geometry);

			this.fitCameraToObject(mesh);
		} );
		
		return loaded_model;

	}

	fitCameraToObject(mesh) {
		const offset = 1.25;
	
		if ( mesh.geometry.boundingBox == null ) mesh.geometry.computeBoundingBox();
		if ( mesh.geometry.boundingSphere == null ) mesh.geometry.computeBoundingSphere();

		let boundingBox = mesh.geometry.boundingBox;

		const wcs_center = new THREE.Vector3(0,0,0);
		const center = boundingBox.getCenter(wcs_center);
		const size   = boundingBox.getSize(wcs_center);
	
		const maxDim = Math.max( size.x, size.y, size.z );
	
		this.camera.position.x = maxDim * offset;
		this.camera.position.y = maxDim * offset;
		this.camera.position.z = maxDim * offset;
	
		if ( this.controls ) {
			this.controls.target = wcs_center;
			this.controls.update();
		} else {
			this.camera.lookAt( center );
	    }
	}

	createGUI() {
		this.gui = new GUI();
		this.guiState = {
			awcsEnabled : true,
			wcsScale : 1,
			zoomFit : function() {
				window.app.zoomFit();
			},
			partID : '',
			load : function() {
				window.app.partChange();
			}
		}

		const viewControls = this.gui.addFolder('View');
		viewControls.add(this.guiState,'awcsEnabled')
			.name('Show WCS')
			.onChange(() => {
				if (this.axesHelper) {
					this.axesHelper.visible = this.guiState.awcsEnabled;
				}
		} );
		viewControls.add(this.guiState,'wcsScale',1,100,1)
			.name('WCS Size')
			.onChange(()=>{
				this.updateWcsScale();
		});
		viewControls.add(this.guiState,'zoomFit').name('Zoom to fit');
		viewControls.open();

		const partFolder = this.gui.addFolder('Current part'); 
		partFolder.add(this.guiState, 'partID')
			.name('Part ID');
		partFolder.add(this.guiState,'load').name('Load');;
		partFolder.open();
	}

	updateWcsScale() {
		if (this.axesHelper) {
			this.axesHelper.scale.x = this.guiState.wcsScale;
			this.axesHelper.scale.y = this.guiState.wcsScale;
			this.axesHelper.scale.z = this.guiState.wcsScale;
		}
	}

	partChange() {
		if (this.main_object) {
			this.main_object.removeFromParent();
			this.main_object.traverse( (child) => {
				if (child.isMesh) {
					child.geometry.dispose();
				}
			} );
		}
		this.activateModel();
	}

	zoomFit() {
		// for now, just zoom to the first mesh
		if (this.main_object) {
			let mesh = null;
			for (const child of this.main_object.children) {
				if (child.isMesh) {
					mesh = child;
					break;
				}
			}
			if (mesh) {
				this.fitCameraToObject(mesh);
			}
		}
	}
}

function onWindowResize() {

	window.app.camera.aspect = window.innerWidth / window.innerHeight;
	window.app.camera.updateProjectionMatrix();

	window.app.renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

	requestAnimationFrame( animate );
	window.app.renderer.render( window.app.scene, window.app.camera );

}

export default App;
