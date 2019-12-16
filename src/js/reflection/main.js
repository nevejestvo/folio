import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

import * as h from './_help'

export default function reflection() {

	let cfg = {
		fps: 60,
		cam: {
			posX: 100,
			posY: 0,
			posZ: 0,
			viewAngle: 45,
			width: window.innerWidth,
			height: window.innerHeight,
			near: 1,
			far: 800,
		},
		ray: {
			x: -250,
			y: 0,
			z: 0,
			color: 0x2d1fda,
			colorReflection: 0x2d1fda,
			width: 10,
			height: 290,
			intensity: 3.5,
		},
		ground: {
			texture: 'road',
			width: 512,
			height: 512,
			x: 0,
			y: -50,
			z: 0,
		}
	};

	let NEAR = 1,
		FAR = 800,
		camera, cubeCamera, scene, renderer,
		controls,
		ground,

		stats,
		statsEnabled = true,

		param = {};

	init();
	animate();

	function init() {

		class ColorGUIHelper {
			constructor(object, prop) {
				this.object = object;
				this.prop = prop;
			}
			get value() {
				return `#${this.object[this.prop].getHexString()}`;
			}
			set value(hexString) {
				this.object[this.prop].set(hexString);
			}
		}

		var container = document.getElementById('jsReflection');

		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(cfg.cam.width, cfg.cam.height);
		container.appendChild(renderer.domElement);

		scene = new THREE.Scene();

		camera = new THREE.PerspectiveCamera(cfg.cam.viewAngle, cfg.cam.width / cfg.cam.height, cfg.cam.near, cfg.cam.far);
		camera.position.set(cfg.cam.posX, cfg.cam.posY, cfg.cam.posZ);

		controls = new OrbitControls(camera, renderer.domElement);
		controls.autoRotate = false;
		controls.autoRotateSpeed = 1;

		controls.target.set(0, 0, 0);
		controls.maxPolarAngle = Math.PI / 2
		controls.enableZoom = false;
		controls.enablePan = false;
		controls.enableDamping = true;
		controls.dampingFactor = 0.009;
		controls.rotateSpeed = 0.009;
		// controls.screenSpacePanning = false;

		controls.dispose();
		controls.update();

		// cube camera for environment map
		cubeCamera = new THREE.CubeCamera(0, 512, 512);
		cubeCamera.renderTarget.texture.generateMipmaps = true;
		cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipmapLinearFilter;
		cubeCamera.renderTarget.texture.mapping = THREE.CubeReflectionMapping;
		scene.add(cubeCamera);

		// ground ( with box projected environment mapping )
		var loader = new THREE.TextureLoader();
		var rMap = loader.load(`img/textures/lava/${cfg.ground.texture}.jpg`);
		rMap.wrapS = THREE.RepeatWrapping;
		rMap.wrapT = THREE.RepeatWrapping;
		rMap.repeat.set(1, 1);
		var defaultMat = new THREE.MeshPhysicalMaterial({
			roughness: 1,
			envMap: cubeCamera.renderTarget.texture,
			roughnessMap: rMap
		});
		var boxProjectedMat = new THREE.MeshPhysicalMaterial({
			color: new THREE.Color(cfg.ray.colorReflection),
			roughness: 0.75,
			envMap: cubeCamera.renderTarget.texture,
			roughnessMap: rMap
		});
		boxProjectedMat.onBeforeCompile = function (shader) {
			//these parameters are for the cubeCamera texture
			shader.uniforms.cubeMapSize = { value: new THREE.Vector3(0, 0, 0) };
			shader.uniforms.cubeMapPos = { value: new THREE.Vector3(0, 0, 0) };
			shader.uniforms.flipEnvMap.value = true;
			//replace shader chunks with box projection chunks
			shader.vertexShader = 'varying vec3 vWorldPosition;\n' + shader.vertexShader;
			shader.vertexShader = shader.vertexShader.replace(
				'#include <worldpos_vertex>',
				h.worldposReplace
			);
			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <envmap_physical_pars_fragment>',
				h.envmapPhysicalParsReplace
			);
		};
		ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(cfg.ground.width, cfg.ground.height, 0), boxProjectedMat);
		ground.rotateX(- Math.PI / 2);
		ground.position.set(cfg.ground.x, cfg.ground.y, cfg.ground.z);
		scene.add(ground);

		var ambient = new THREE.AmbientLight(cfg.ray.color, 0.01);
		scene.add(ambient);

		//ray

		let ray = new THREE.RectAreaLight(cfg.ray.color, cfg.ray.intensity, cfg.ray.width, cfg.ray.height);
		ray.position.set(-150, 0, 0);
		ray.lookAt(0, 0, 0);
		scene.add(ray);

		var rectLightMesh = new THREE.Mesh(
			new THREE.PlaneBufferGeometry(),
			new THREE.MeshBasicMaterial({
				color: cfg.ray.color,
				side: THREE.BackSide,
			})
		);
		rectLightMesh.scale.x = ray.width;
		rectLightMesh.scale.y = ray.height;
		ray.add(rectLightMesh);

		RectAreaLightUniformsLib.init();

		//stats
		if (statsEnabled) {
			stats = new Stats();
			container.appendChild(stats.dom);
		}

		// gui controls
		var gui = new GUI();

		var params = { 'box projected': true };

		const guiBP = gui.add(params, 'box projected');
		guiBP.onChange(function (value) {
			if (value) {
				ground.material = boxProjectedMat;
			} else {
				ground.material = defaultMat;
			}
			render();
		});

		param = {
			color: ray.color.getHex(),
			colorReflection: boxProjectedMat.color.getHex(),
			width: ray.width,
			height: ray.height,
			roughness1: defaultMat.roughness,
			roughness2: boxProjectedMat.roughness,
			'ambient': ambient.intensity,
		};

		const guiSceneCfg = gui.addFolder(`Scene params`);
		guiSceneCfg.add(scene.position, 'x', -300, 300).step(1).name('position x');
		guiSceneCfg.add(scene.position, 'y', -300, 300).step(1).name('position y');
		guiSceneCfg.add(scene.position, 'z', -300, 300).step(1).name('position z');
		// guiSceneCfg.open();

		const guiCameraCfg = gui.addFolder(`Camera params`);
		guiCameraCfg.add(camera.position, 'x', -500, 500).step(1).name('position x');
		guiCameraCfg.add(camera.position, 'y', -500, 500).step(1).name('position y');
		guiCameraCfg.add(camera.position, 'z', -500, 500).step(1).name('position z');
		// guiCameraCfg.open();

		const guiRayCfg = gui.addFolder(`Ray params`);
		guiRayCfg.add(ray.position, 'x', -500, 500).name('position x');
		guiRayCfg.add(ray.position, 'y', -500, 500).name('position y');
		guiRayCfg.add(ray.position, 'z', -500, 500).name('position z');
		guiRayCfg.addColor(param, 'color').name('color').onChange(function (val) {
			ray.color.setHex(val);
			rectLightMesh.material.color.copy(ray.color).multiplyScalar(ray.intensity);
		});
		guiRayCfg.addColor(param, 'color').name('Reflection Color').onChange(function (val) {
			boxProjectedMat.color.setHex(val);
		});
		guiRayCfg.add(param, 'width', 1, 20).step(0.1).onChange(function (val) {
			ray.width = val;
			rectLightMesh.scale.x = val;
		});
		guiRayCfg.add(param, 'height', 1, 500).step(1).onChange(function (val) {
			ray.height = val;
			rectLightMesh.scale.y = val;
		});
		guiRayCfg.add(ray, 'intensity', 0, 15).name('intensity');
		guiRayCfg.add(param, 'roughness1', 0, 1).step(0.1).name('roughness1').onChange(function (val) {
			defaultMat.roughness = val;
		});
		guiRayCfg.add(param, 'roughness2', 0, 1).step(0.1).name('roughness2').onChange(function (val) {
			boxProjectedMat.roughness = val;
		});
		guiRayCfg.add(param, 'ambient', 0.0, 0.2).step(0.01).onChange(function (val) {
			ambient.intensity = val;
		});
		guiRayCfg.open();

		const guiGroundCfg = gui.addFolder(`Ground params`);
		guiGroundCfg.add(ground.position, 'x', -500, 500).name('x');
		guiGroundCfg.add(ground.position, 'y', -500, 500).name('y');
		guiGroundCfg.add(ground.position, 'z', -500, 500).name('z');
		// guiGroundCfg.open();

		window.addEventListener('resize', onWindowResize, false);
		window.addEventListener('mousemove', onDocumentMouseMove, false);


	}

	function updateCubeMap() {
		ground.visible = false;
		cubeCamera.position.copy(ground.position);
		cubeCamera.update(renderer, scene);
		ground.visible = true;

		render();
	}

	function onDocumentMouseMove(event) {
		controls.handleMouseMoveRotate(event);
	}

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	function animate() {

		requestAnimationFrame(animate);
		updateCubeMap();
		controls.update();

		if (statsEnabled) { stats.update() };
	}

	function render() {

		renderer.render(scene, camera);
	}

}