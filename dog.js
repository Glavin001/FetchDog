var init, render, ball, cameraball, loader,
		renderer, scene, ground_material, ground, 
		light, camera, camControls, raycaster, mouseCoords, dog, mixer, walk, clock, clockdelta, tree, 
		mapCamera, playerTrack, ballTrack, bark;

Physijs.scripts.worker = 'libjs/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

var blocker = document.getElementById( 'blocker' );
var instructions = document.getElementById( 'instructions' );

var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

if ( havePointerLock ) {
	var element = document.body;
	var pointerlockchange = function ( event ) {
		if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {
			controlsEnabled = true;
			controls.enabled = true;
			blocker.style.display = 'none';
		} else {
			controls.enabled = false;
			blocker.style.display = '-webkit-box';
			blocker.style.display = '-moz-box';
			blocker.style.display = 'box';
			instructions.style.display = '';
		}
	};
	var pointerlockerror = function ( event ) {
		instructions.style.display = '';
	};
				// Hook pointer lock state change events
	document.addEventListener( 'pointerlockchange', pointerlockchange, false );
	document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
	document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );
	document.addEventListener( 'pointerlockerror', pointerlockerror, false );
	document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
	document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );
	instructions.addEventListener( 'click', function ( event ) {
		instructions.style.display = 'none';
		// Ask the browser to lock the pointer
		element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
		element.requestPointerLock();
	}, false );
} else {
	instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
}

var controlsEnabled = false;
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var canJump = false;
var ballreset = false;
var moveDog = false;
var leftDog = false;
var rightDog = false;
var dogHasBall = false;

var prevTime = performance.now();
var velocity = new THREE.Vector3();

function init() {
	var textureloader = new THREE.TextureLoader();
	var loader = new THREE.JSONLoader();

	clock = new THREE.Clock();

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setClearColor( 0xffffff );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.autoClear = false;
	document.body.appendChild( renderer.domElement);

	scene = new Physijs.Scene;
	scene.setGravity(new THREE.Vector3( 0, -100, 0 ));
	scene.addEventListener(
		'update',
		function() {
			scene.simulate( undefined, 1 );
		}
	);
	//music
	var music = new Audio('sounds/music.mp3');
	bark = new Audio('sounds/bark.wav');
	music.loop = true;
	music.volume = 0.1;
	bark.volume = 0.1
	music.play()

	// dog
	loader.load('models/doggo.json', function (geometry, materials) {
		materials.forEach(function (material) {
			material.skinning = true;
		});
		dog = new THREE.SkinnedMesh(
			geometry,
			materials
			);

		mixer = new THREE.AnimationMixer(dog);

		walk = mixer.clipAction(geometry.animations[ 0 ]);
		walk.setEffectiveWeight(1);
		walk.enabled = true;
		// walk.setLoop(THREE.LoopPingPong)
		walk.warp(4, 4, 0.1);
		dog.position.set(0, 0, -50)
		scene.add(dog);
		dog.castShadow = true;
		dog.recieveShadow = true;

		var geometry = new THREE.ConeGeometry( 20, 100, 4);
		var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
		var dogTrack = new THREE.Mesh( geometry, material );
		dogTrack.position.set(0, 2500, 0)
		dogTrack.rotation.set(Math.PI/2, 0, Math.PI);
		dog.add(dogTrack);
	});
	
	// Materials
	ground_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ map: textureloader.load( 'images/grass1.jpg' ) }),
		1.0, // high friction
		.4 // low restitution
		);
	ground_material.map.wrapS = ground_material.map.wrapT = THREE.RepeatWrapping;
	ground_material.map.repeat.set( 40.0, 40.0 );
		
	// Ground
	NoiseGen = new SimplexNoise;
		
	ground_geometry = new THREE.PlaneGeometry(800, 800, 10, 10);
	for ( var i = 0; i < ground_geometry.vertices.length; i++ ) {
		var vertex = ground_geometry.vertices[i];
		vertex.z = NoiseGen.noise( vertex.x / 10, vertex.y / 10 ) * 10;
	}
	ground_geometry.computeFaceNormals();
	ground_geometry.computeVertexNormals();
	// If your plane is not square as far as face count then the HeightfieldMesh
	// takes two more arguments at the end: # of x faces and # of y faces that were passed to THREE.PlaneMaterial
	ground = new Physijs.HeightfieldMesh(
		ground_geometry,
		ground_material,
		0, // mass
		10,
		10
	);
	ground.rotation.x = Math.PI / -2;
	ground.receiveShadow = true;
	ground.castShadow = true;
	scene.add( ground );

	//rock
	var rock_material = Physijs.createMaterial( 
		new THREE.MeshLambertMaterial({ color: 0x808080 }),
		0.4,  0.7
	);
	var rockPoints = [ new THREE.Vector3(8, 0, 0), new THREE.Vector3(-6, 0, 0), new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -7),
				new THREE.Vector3(8, 3, 0), new THREE.Vector3(-8, 2, 0), new THREE.Vector3(0, 4, 8), new THREE.Vector3(0, 2, -8),
				new THREE.Vector3(4, 8, 0), new THREE.Vector3(-4, 6, -4), new THREE.Vector3(0, 5, 0),  new THREE.Vector3(4, 8, -4)];
	var rock_geometry = new THREE.ConvexGeometry( rockPoints );
	rock_geometry.computeFaceNormals();
	rock_geometry.computeVertexNormals();
	var rock1 = new Physijs.ConvexMesh( rock_geometry, rock_material);
	var rock2 = new Physijs.ConvexMesh( rock_geometry, rock_material);
	var rock3 = new Physijs.ConvexMesh( rock_geometry, rock_material);
	rock1.castShadow = true;
	rock1.recieveShadow = true;
	rock2.castShadow = true;
	rock2.recieveShadow = true;
	rock3.castShadow = true;
	rock3.recieveShadow = true;
	rock1.position.set(160, 5, 150)
	scene.add( rock1 );
	rock2.position.set(-200, 5, 160)
	rock2.rotation.set(0, 0, Math.PI/4)
	scene.add( rock2 );
	rock3.position.set(-50, 5, -70)
	rock3.rotation.set(0, 0, Math.PI/4)
	scene.add( rock3 );


	//walls
	wall_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ map:  textureloader.load("images/wall.jpg") }),
			.8, // high friction
			0.9 // low restitution
		);
	wall_material.map.wrapS = wall_material.map.wrapT = THREE.RepeatWrapping;
	wall_material.map.repeat.set( 10.0, 1.0 );

	wall1 = new Physijs.BoxMesh(new THREE.BoxGeometry(800, 1, 50), wall_material, 0 );
	wall1.rotation.set(Math.PI/2, 0, Math.PI/2);
	wall1.position.set(400, 15, 0);

	wall2 = new Physijs.BoxMesh(new THREE.BoxGeometry(800, 1, 50), wall_material, 0 );
	wall2.rotation.set(Math.PI/2, 0, Math.PI/2);
	wall2.position.set(-400, 15, 0);

	wall3 = new Physijs.BoxMesh(new THREE.BoxGeometry(800, 1, 50), wall_material, 0 );
	wall3.rotation.set(Math.PI/2, 0, 0);
	wall3.position.set(0, 15, 400);

	wall4 = new Physijs.BoxMesh(new THREE.BoxGeometry(800, 1, 50), wall_material, 0 );
	wall4.rotation.set(Math.PI/2, 0, 0);
	wall4.position.set(0, 15, -400);
	wall1.castShadow = true;
	wall1.receiveShadow = true;
	wall2.castShadow = true;
	wall2.receiveShadow = true;
	wall3.castShadow = true;
	wall3.receiveShadow = true;
	wall4.castShadow = true;
	wall4.receiveShadow = true;

	scene.add(wall1);
	scene.add(wall2);
	scene.add(wall3);
	scene.add(wall4);

	// trees
	var mtlLoader = new THREE.MTLLoader();
	var objLoader = new THREE.OBJLoader();
	var tree_materials = mtlLoader.load( 'models/tree/tree.mtl', function( materials ) {
		materials.preload();
		objLoader.setMaterials( materials );
	});
	objLoader.load( 'models/tree/tree.obj', function ( object ) {
			object.scale.set(12.0, 12.0, 12.0)
			object.position.set(375, 0, 375)
			scene.add(object);
	});
	objLoader.load( 'models/tree/tree.obj', function ( object ) {
		object.scale.set(12.0, 12.0, 12.0)
		object.position.set(-375, 0, -375)
		scene.add(object);
	});
	objLoader.load( 'models/tree/tree.obj', function ( object ) {
		object.scale.set(12.0, 12.0, 12.0)
		object.position.set(-375, 0, 375)
		scene.add(object);
	});
	objLoader.load( 'models/tree/tree.obj', function ( object ) {
		object.scale.set(12.0, 12.0, 12.0)
		object.position.set(375, 0, -375)
		scene.add(object);
	});
	objLoader.load( 'models/tree/tree.obj', function ( object ) {
		object.scale.set(12.0, 12.0, 12.0)
		object.position.set(300, 0, 200)
		scene.add(object);
	});
	objLoader.load( 'models/tree/tree.obj', function ( object ) {
		object.scale.set(12.0, 12.0, 12.0)
		object.position.set(-100, 0, -200)
		scene.add(object);
	});


	//light
	var ambient = new THREE.AmbientLight( 0xFFFFFF );
	scene.add( ambient );

	// Light
	light = new THREE.SpotLight( 0xffffff, 1, 0, Math.PI / 2 );
	light.position.set( 0, 750, 1000 );
	light.target.position.set( 0, 0, 0 );

	light.castShadow = true;

	light.shadow = new THREE.LightShadow( new THREE.PerspectiveCamera( 50, 1, 1200, 2500 ) );
	light.shadow.bias = 0.0001;

	light.shadow.mapSize.width = 2048;
	light.shadow.mapSize.height = 2048;
	scene.add( light );

	//Map Camera
	mapCamera = new THREE.OrthographicCamera(
	    window.innerWidth / -2,		// Left
	    window.innerWidth / 2,		// Right
	    window.innerHeight / 2,		// Top
	    window.innerHeight / -2,	// Bottom
	    -5000,            			// Near 
	    10000 );           			// Far 
	mapCamera.up = new THREE.Vector3(0,0,-1);
	mapCamera.lookAt( new THREE.Vector3(0,-1,0) );
	scene.add(mapCamera);

	//skybox
	var imagePrefix = "images/Daylight-";
	var directions  = ["xpos", "xneg", "ypos", "yneg", "zpos", "zneg"];
	var imageSuffix = ".bmp";
	var skyGeometry = new THREE.CubeGeometry( 1000, 1000, 1000 );	
	
	var materialArray = [];
	for (var i = 0; i < 6; i++)
		materialArray.push( new THREE.MeshBasicMaterial({
			map: textureloader.load( imagePrefix + directions[i] + imageSuffix ),
			side: THREE.BackSide
		}));
	var skyBox = new THREE.Mesh( skyGeometry, materialArray );
	scene.add( skyBox );

	raycaster = new THREE.Raycaster();
	mouseCoords = new THREE.Vector2();

	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
	controls = new THREE.PointerLockControls(camera);
	scene.add( controls.getObject() );

	//minimap tracker
	var geometry = new THREE.ConeGeometry( 20, 100, 4);
	var material = new THREE.MeshBasicMaterial( {color: 0xff0000} );
	playerTrack = new THREE.Mesh( geometry, material );
	playerTrack.position.set(0, 2500, 0)
	playerTrack.rotation.set(Math.PI/2, 0, Math.PI);
	scene.add(playerTrack);

	var geometry = new THREE.SphereGeometry( 20, 10, 10);
	var material = new THREE.MeshBasicMaterial( {color: 0x0000ff} );
	ballTrack = new THREE.Mesh( geometry, material );
	ballTrack.position.set(0, 2500, 0)

	//ball
	ball_material = Physijs.createMaterial( 
		new THREE.MeshLambertMaterial({ map: textureloader.load( 'images/kickball.jpg') }),
		1.0,  0.7
	);
	cameraball = new Physijs.SphereMesh(
		new THREE.SphereGeometry( 0.5 , 15, 15),
		ball_material
	);
	ball = new Physijs.SphereMesh(
		new THREE.SphereGeometry(1, 15, 15),
		ball_material
	);
	ball.name = "ball";
	cameraball.position.z = -10
	camera.add(cameraball);
	ball.castShadow = true;
	ball.position.set(0 , 10, 0);

	//ball dampening
	var slowing_rate = new THREE.Vector3(10, 10, 10);
	var mesh_eps = 0.0001;
	scene.addEventListener("update", function() {
		if (scene.getObjectByName("ball") != null) {
			if(ball.getLinearVelocity().length() < mesh_eps && ball.position.y < 1) {
				ball.setLinearVelocity(new THREE.Vector3(0, 0, 0));
			} else {
				if (ball.position.y < 1) {
					ball.setLinearVelocity(ball.getLinearVelocity().multiplyScalar(0.94));
				}
			}
		}
	});
	animate();
}

function animate() {
	requestAnimationFrame(animate);
	scene.simulate();
	clockdelta = clock.getDelta();
	mixer.update(clockdelta);
	
	var w = window.innerWidth, h = window.innerHeight;
	var mapWidth = w/5, mapHeight = h/5;

	// setViewport parameters:
	//  lower_left_x, lower_left_y, viewport_width, viewport_height
	renderer.setViewport( 0, 0, w, h );
	renderer.clear();
	
	// full display
	// renderer.setViewport( 0, 0, SCREEN_WIDTH - 2, 0.5 * SCREEN_HEIGHT - 2 );
	renderer.render( scene, camera );
	
	// minimap (overhead orthogonal camera)
	//  lower_left_x, lower_left_y, viewport_width, viewport_height
	renderer.setViewport( 10, h - mapHeight - 10, mapWidth, mapHeight );
	renderer.render( scene, mapCamera );

	var time = performance.now();
	var delta = ( time - prevTime ) / 1000;
	mixer.update(delta);

	velocity.x -= velocity.x * 10.0 * delta;
	velocity.z -= velocity.z * 10.0 * delta;

	velocity.y -= 9.8 * 50.0 * delta;

	if ( moveForward ) velocity.z -= 400.0 * delta;
	if ( moveBackward ) velocity.z += 400.0 * delta;

	if ( moveLeft ) velocity.x -= 400.0 * delta;
	if ( moveRight ) velocity.x += 400.0 * delta;

	controls.getObject().translateX( velocity.x * delta );
	controls.getObject().translateY( velocity.y * delta );
	controls.getObject().translateZ( velocity.z * delta );

	if ( moveDog) {
		dog.translateZ(-65 * delta );
		walk.enabled = true;
		walk.pause = false;
		walk.play();
		if (dogHasBall) {
			cameraball.position.set(0, 6, -7);
			dog.add(cameraball);
		}
	} else {
		walk.pause = true; walk.enabled = false;
		if (dogHasBall) {
			cameraball.position.set(0, 7, -5);
			dog.add(cameraball);
		}
	}

	if ( leftDog) dog.rotateY(5 * delta);
	if ( rightDog) dog.rotateY(-5 * delta);
	if ( controls.getObject().position.y < 10 ) {
		velocity.y = 0;
		controls.getObject().position.y = 15;
		canJump = true;
	}

	//move with the hills
	var heightcaster = new THREE.Raycaster( controls.getObject().position, new THREE.Vector3(0, -1, 0) );
	var intersects = heightcaster.intersectObject( ground);
	if (intersects[0] != null) {
		if (canJump) {
			controls.getObject().position.y =  intersects[0].point.y + 15;
		}
	}

	var dogcaster = new THREE.Raycaster( new THREE.Vector3(dog.position.x, dog.position.y + 5, dog.position.z), new THREE.Vector3(0, -1, 0) );
	var dogintersects = dogcaster.intersectObject(ground);
	if (dogintersects[0] != null) {
		dog.position.y = dogintersects[0].point.y;
	}

	//dog ball logic
	var myPosition = new THREE.Vector3(controls.getObject().position.x, controls.getObject().position.y, controls.getObject().position.z);
	if (scene.getObjectByName("ball") != null) {
		if(!ballreset && dog.position.distanceTo(ball.position) < 10.0) {
			dogHasBall = true;
			bark.play();
			scene.remove(ball);
			scene.remove(ballTrack);
		}
	} else if (dog.position.distanceTo(myPosition) < 20.0 && dogHasBall) {
		dogHasBall = false;
		ballreset = true;
		dog.remove(cameraball);
		cameraball.position.set(0, 0, -10);
		camera.add(cameraball);
	}

	//update minimap tracking
	playerTrack.position.set(myPosition.x, myPosition.y, myPosition.z);
	playerTrack.rotation.set(Math.PI/2, 0, camera.getWorldRotation().y - Math.PI)
	ballTrack.position.set(ball.position.x, 2500, ball.position.z);

	prevTime = time;
}

function onMouseDown(event) {
	if(ballreset) {
		mouseCoords.set(
			( event.clientX / window.innerWidth ) * 2 - 1,
			- ( event.clientY / window.innerHeight ) * 2 + 1
			);
		scene.add(ball)
		scene.add(ballTrack);
		ball.position.set(controls.getObject().position.x , controls.getObject().position.y, controls.getObject().position.z )
		ball.__dirtyPosition = true;

		raycaster.setFromCamera(mouseCoords, camera);
		ball.position.copy(raycaster.ray.direction);
		ball.position.add(raycaster.ray.origin); 
		ball.setLinearVelocity( raycaster.ray.direction.multiplyScalar(80)); 
		ballreset = false;
		camera.remove(cameraball);
	}
}

function keyDown(event) {
	switch ( event.keyCode ) {

	case 16: // r shift
	bark.play();
	break;

	case 38: // up
	moveDog = true;
	break;

	case 87: // w
	moveForward = true;
	break;

	case 37: // left
	leftDog  = true;
	break

	case 65: // a
	moveLeft = true; 
	break;

	case 83: // s
	moveBackward = true;
	break;

	case 39: // right
	rightDog = true;
	break;

	case 68: // d
	moveRight = true;
	break;

	case 32: // space
	if ( canJump == true ) {
		velocity.y += 150;
	}
	canJump = false;
	break;

	case 13: // enter
	ballreset = true;
	dogHasBall = false;
	dog.remove(cameraball);
	cameraball.position.set(0, 0, -10);
	camera.add(cameraball)
	if (scene.getObjectByName("ball") != null) {
		scene.remove(ball)
		scene.remove(ballTrack)
	}
	break;
	}
}

function keyUp(event) {
	switch( event.keyCode ) {

	case 38: // up
	moveDog = false;
	break;

	case 87: // w
	moveForward = false;
	break;

	case 37: // left
	leftDog = false;
	break;

	case 65: // a
	moveLeft = false;
	break;

	case 83: // s
	moveBackward = false;
	break;

	case 39: // right
	rightDog = false;
	break;

	case 68: // d
	moveRight = false;
	break;

	}
}


window.addEventListener('keydown', keyDown, false);
window.addEventListener('keyup', keyUp, false);
document.body.addEventListener( 'mousedown', onMouseDown, false ); 

window.onload = init;
