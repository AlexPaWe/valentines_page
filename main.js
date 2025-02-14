/* Valentines Page: This is a webpage to offer digital goods (pdf) as a interactive letter in the style of ps1 games.
Copyright (C) 2025  AlexPaWe

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>. */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';

import { gsap } from "gsap";
		
import etUrl from './textures/envelope_texture.png';
import liUrl from'./textures/letter_inside.jpg';
import pdfUrl from './pdf/letter.pdf';
import hUrl from './textures/heart.png';
	
// create 3D scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
		
camera.enableDamping = true;
camera.enablePan = false;
camera.enableZoom = false;
		
// position camera
camera.position.z = 5;

// Save original camera position and orientation
const initialCameraPosition = camera.position.clone();
const initialCameraRotation = camera.rotation.clone();
		
// Post-processing setup
const composer = new EffectComposer(renderer);

// Pixelation Shader (Three.js Built-in)
const renderPixelatedPass = new RenderPixelatedPass( 4.5, scene, camera );
composer.addPass( renderPixelatedPass );

// Add ambient light (uniform lighting in the whole scene)
const ambientLight = new THREE.AmbientLight(0x404040, 3); // Color and intensity
scene.add(ambientLight);

// create 3D model of a letter
const geometry = new THREE.BoxGeometry(2, 0.1, 1); // A simple rectangle for the letter
        
// Load and apply a texture	
const textureLoader = new THREE.TextureLoader();
const envelopeTexture = textureLoader.load(
	etUrl,
	() => console.log('Successfully loaded envelope texture!'),
	undefined,
	(err) => console.error('Error at loading envelope texture:', err.message, err)
);
const material = new THREE.MeshBasicMaterial({ map: envelopeTexture });
const letter = new THREE.Mesh(geometry, material);
		
// rotate the letter into a tilted orientation
letter.rotation.x = Math.PI / 4;  // 45°
letter.rotation.y = Math.PI / 6;  // 30°
scene.add(letter);

let isRotating = true; // The letter is rotating by default

// Additional lightsource: a point light to better light the scene
const pointLight = new THREE.PointLight(0xffffff, 3, 100); // white pointlight
pointLight.position.set(5, 5, 5); // position of the light
scene.add(pointLight);
		
// Raycasting Setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Function to detect the mouse position
function onMouseMove(event) {
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}
		
let letterState = 'closed'; // Possible values: 'closed', 'opened', 'zoomed'
		
let heartParticles = null; // Holds the particle group
		
function createHeartExplosion() {
	const particleCount = 30; // Number of hearts
	heartParticles = new THREE.Group(); // Group for all particles

	const heartTexture = new THREE.TextureLoader().load(hUrl); // load heart texture
	
	for (let i = 0; i < particleCount; i++) {
		const geometry = new THREE.PlaneGeometry(0.2, 0.2);
		const material = new THREE.MeshBasicMaterial({
			map: heartTexture,
			transparent: true,
			side: THREE.DoubleSide
		});

		const particle = new THREE.Mesh(geometry, material);

		// Random direction for the explosion
		const direction = new THREE.Vector3(
			(Math.random() - 0.5) * 4,
			Math.random() * 4,
			(Math.random() - 0.5) * 4
		);

		// Animates the movement of the heart
		gsap.to(particle.position, {
			duration: 3,
			x: particle.position.x + direction.x,
			y: particle.position.y + direction.y,
			z: particle.position.z + direction.z,
			ease: "power2.out"
		});

		heartParticles.add(particle);
				
		heartParticles.rotation.copy(letter.rotation);
	}
			
	scene.add(heartParticles);
}

// Click event
function onClick(event) {
	// Get current mouse position
	onMouseMove(event);  // Ensures that the position is always correct
	
    // Throw ray from the mouse's position
    raycaster.setFromCamera(mouse, camera);

    // Collision with the letter
    const intersects = raycaster.intersectObject(letter);

    // When the letter is hit by the ray
    if (intersects.length > 0) {
        if (letterState === 'closed') {
			openLetter();
			letterState = 'opened';
		} else if (letterState === 'opened') {
			zoomLetter();
			letterState = 'zoomed';
		} else if (letterState == 'zoomed') {
			downloadLetter();
		}
    }
}

function openLetter() {
	// DIN A4 aspect ratio: 1 (Width) : 1.414 (Height)
	const dinA4Width = 2; // original width
	const dinA4Height = dinA4Width * 1.414;

	// Scaling of the letter to DIN A4
	gsap.to(letter.scale, { 
		duration: 1.5, 
		x: dinA4Width, 
		y: 0.1, 
		z: dinA4Height, 
		ease: "power2.inOut" 
	});
			
	const letterTexture = textureLoader.load(
		liUrl,
		() => console.log('Successfully loaded letter texture!'),
		undefined,
		(err) => console.error('Error during load of the letter texture:', err.message, err)
	);
	material.map = letterTexture;
	envelopeTexture.dispose();
		
	// start hearts explosion
	createHeartExplosion();
			
}

function zoomLetter() {
	const aspectRatio = 1 / 1.414;  // DIN A4 aspect ration (Width/Height)

	// Calculate the visible area based on the camera position and field of view
	const fov = camera.fov * (Math.PI / 180); // Convert to radian
	const distance = camera.position.z; // Distance of the camera to the letter
	const visibleHeight = 2 * Math.tan(fov / 2) * distance; // visibility height
	const visibleWidth = visibleHeight * (window.innerWidth / window.innerHeight); // visibility Width

	// The letter shall only cover 60% of the visible area
	const maxWidth = visibleWidth * 0.9;
	const maxHeight = visibleHeight * 0.9;

	// Calculate the final size while keeping the aspect ratio
	let finalWidth = maxWidth;
	let finalHeight = finalWidth / aspectRatio;
	
	if (finalHeight > maxHeight) {
		finalHeight = maxHeight;
		finalWidth = finalHeight * aspectRatio;
	}
			
	// set endposition and rotation
	const finalRotationX = Math.PI / 2; // Endrotation X
	const finalRotationY = Math.PI / 2; // Endrotation Y
	const finalRotationZ = 0; // Endrotation Z

	const finalPositionX = 0;
	const finalPositionY = 0;
	const finalPositionZ = 0;

	// Gentle stop of the rotation
	gsap.to(letter.rotation, { 
		duration: 1.5, 
		x: finalRotationX,
		y: finalRotationY,
		z: finalRotationZ,
		ease: "power2.inOut", 
		onComplete: () => isRotating = false // completely stop rotation after animation
	});

	gsap.to(letter.scale, { 
		duration: 1.5, 
		x: finalWidth / 2, 
		y: 0.1, 
		z: finalHeight / 2, 
		ease: "power2.inOut" 
	});

	gsap.to(letter.position, { 
		duration: 1.5, 
		x: 0, 
		y: 0, 
		z: 0, 
		ease: "power2.inOut" 
	});
			
	// Slowly fade out heart particles
	if (heartParticles) {
		heartParticles.children.forEach((particle) => {
			gsap.to(particle.material, {
				duration: 0.5,
				opacity: 0,
				ease: "power2.out",
				onComplete: () => {
					particle.visible = false; // Hide the particle completely
					particle.geometry.dispose(); // Free memory
					particle.material.dispose(); // Free memory
					scene.remove(particle); // Remove from scene
				}
			});
		});
	}
			
	// Reset camera
	gsap.to(camera.position, {
		duration: 1.5,
		x: initialCameraPosition.x,
		y: initialCameraPosition.y,
		z: initialCameraPosition.z,
		ease: "power2.inOut"
	});

	gsap.to(camera.rotation, {
		duration: 1.5,
		x: initialCameraRotation.x,
		y: initialCameraRotation.y,
		z: initialCameraRotation.z,
		ease: "power2.inOut"
	});
}
		
function downloadLetter() {
	download(pdfUrl);
}
		
function download(url) {
	const a = document.createElement('a')
	a.href = url
	a.download = url.split('/').pop()
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
}

// Event listener for mouse movement and click
window.addEventListener('mousemove', onMouseMove, false);
renderer.domElement.addEventListener('click', onClick, false);
		
function animate() {
    requestAnimationFrame(animate);
            
	if (isRotating) {
		letter.rotation.y += 0.005; // continous rotation
		if (heartParticles) {
			heartParticles.rotation.y += 0.005;
		}
	}

    composer.render();
}
        
animate();

// adapt to window resize
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
			
	// update shader-resolution
	composer.setSize(window.innerWidth, window.innerHeight);
	zoomLetter();
});