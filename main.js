import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';

import { gsap } from "gsap";
		
import etUrl from './textures/envelope_texture.jpg';
import liUrl from'./textures/letter_inside.jpg';
import pdfUrl from './pdf/letter.pdf';
import hUrl from './textures/heart.png';
	
// 3D Szene erstellen
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
		
camera.enableDamping = true;
camera.enablePan = false;
camera.enableZoom = false;
		
// Kamera positionieren
camera.position.z = 5;
	
// Ursprüngliche Kamera-Position & Orientierung speichern
const initialCameraPosition = camera.position.clone();
const initialCameraRotation = camera.rotation.clone();
		
// Post-Processing Setup
const composer = new EffectComposer(renderer);

// Pixelation Shader (Three.js Built-in)
const renderPixelatedPass = new RenderPixelatedPass( 4.5, scene, camera );
composer.addPass( renderPixelatedPass );

// Ambient Light hinzufügen (gleichmäßiges Licht in der gesamten Szene)
const ambientLight = new THREE.AmbientLight(0x404040, 3); // Farbe und Intensität
scene.add(ambientLight);

// 3D Modell des Briefes erstellen
const geometry = new THREE.BoxGeometry(2, 0.1, 1); // Ein einfaches Rechteck für den Brief
        
// Textur laden und anwenden	
const textureLoader = new THREE.TextureLoader();
const envelopeTexture = textureLoader.load(
	etUrl,
	() => console.log('Textur erfolgreich geladen!'),
	undefined,
	(err) => console.error('Fehler beim Laden der Textur:', err.message, err)
);
const material = new THREE.MeshBasicMaterial({ map: envelopeTexture });
const letter = new THREE.Mesh(geometry, material);
		
// Den Brief in eine schiefe Position drehen
letter.rotation.x = Math.PI / 4;  // Neigt den Brief um 45 Grad um die X-Achse
letter.rotation.y = Math.PI / 6;  // Neigt den Brief um 30 Grad um die Y-Achse
scene.add(letter);

let isRotating = true; // Der Brief rotiert standardmäßig

// Zusätzliche Lichtquelle: ein Punktlicht, um die Szene besser zu beleuchten
const pointLight = new THREE.PointLight(0xffffff, 3, 100); // weißes Punktlicht
pointLight.position.set(5, 5, 5); // Position des Lichts
scene.add(pointLight);
		
// Raycasting Setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Funktion zum Ermitteln der Mausposition
function onMouseMove(event) {
	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}
		
let letterState = 'closed'; // Mögliche Werte: 'closed', 'opened', 'zoomed'
		
let heartParticles = null; // Speichert die Partikelgruppe
		
function createHeartExplosion() {
	const particleCount = 30; // Anzahl der Herzen
	heartParticles = new THREE.Group(); // Gruppe für alle Partikel

	const heartTexture = new THREE.TextureLoader().load(hUrl); // Herztextur laden
	
	for (let i = 0; i < particleCount; i++) {
		const geometry = new THREE.PlaneGeometry(0.2, 0.2);
		const material = new THREE.MeshBasicMaterial({
			map: heartTexture,
			transparent: true,
			side: THREE.DoubleSide
		});

		const particle = new THREE.Mesh(geometry, material);

		// Zufällige Richtung für die Explosion
		const direction = new THREE.Vector3(
			(Math.random() - 0.5) * 4,
			Math.random() * 4,
			(Math.random() - 0.5) * 4
		);

		// Animiert die Bewegung der Herzen nach außen
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

// Klickereignis
function onClick(event) {
	// Mausposition aktualisieren
	onMouseMove(event);  // Stellt sicher, dass die Position immer aktuell ist
	
    // Ray aus der Mausposition werfen
    raycaster.setFromCamera(mouse, camera);

    // Kollision mit dem Modell des Briefes
    const intersects = raycaster.intersectObject(letter);

    // Wenn der Brief getroffen wird
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

// Beispielaktion: Brief "öffnen"
function openLetter() {
	// DIN A4 Verhältnis: 1 (Breite) : 1.414 (Höhe)
	const dinA4Width = 2; // Ausgangsbreite
	const dinA4Height = dinA4Width * 1.414;

	// Skalierung des Briefes im DIN A4-Format
	gsap.to(letter.scale, { 
		duration: 1.5, 
		x: dinA4Width, 
		y: 0.1, 
		z: dinA4Height, 
		ease: "power2.inOut" 
	});
			
	const letterTexture = textureLoader.load(
		liUrl,
		() => console.log('Letter Textur erfolgreich geladen!'),
		undefined,
		(err) => console.error('Fehler beim Laden der Letter Textur:', err.message, err)
	);
	//letterTexture.rotation = Math.PI / 4;
	material.map = letterTexture;
	envelopeTexture.dispose();
		
	// **Herzen-Explosion starten**
	createHeartExplosion();
			
}
		
// Beispielaktion: Brief "heranzoomen"
function zoomLetter() {
	const aspectRatio = 1 / 1.414;  // DIN A4 Verhältnis (Breite/Höhe)

	// Berechne den sichtbaren Bereich basierend auf der Kameraposition und dem Field of View
	const fov = camera.fov * (Math.PI / 180); // Umwandlung in Radian
	const distance = camera.position.z; // Kamera-Entfernung zum Brief
	const visibleHeight = 2 * Math.tan(fov / 2) * distance; // Sichtbare Höhe
	const visibleWidth = visibleHeight * (window.innerWidth / window.innerHeight); // Sichtbare Breite

	// Der Brief soll max. 60% der sichtbaren Fläche einnehmen
	const maxWidth = visibleWidth * 0.9;
	const maxHeight = visibleHeight * 0.9;

	// Berechne die endgültige Größe unter Beibehaltung des Seitenverhältnisses
	let finalWidth = maxWidth;
	let finalHeight = finalWidth / aspectRatio;
	
	if (finalHeight > maxHeight) {
		finalHeight = maxHeight;
		finalWidth = finalHeight * aspectRatio;
	}
			
	// **Endposition und Rotation setzen**
	const finalRotationX = Math.PI / 2; // Endrotation X (keine Neigung)
	const finalRotationY = Math.PI / 2; // Endrotation Y (keine Drehung)
	const finalRotationZ = 0; // Endrotation Z (keine Verdrehung)

	const finalPositionX = 0;
	const finalPositionY = 0;
	const finalPositionZ = 0;

	// Sanftes Stoppen der Rotation
	gsap.to(letter.rotation, { 
		duration: 1.5, 
		x: finalRotationX,
		y: finalRotationY,
		z: finalRotationZ,
		ease: "power2.inOut", 
		onComplete: () => isRotating = false // Rotation komplett stoppen nach Animation
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
			
	// **Herzpartikel langsam ausblenden**
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
			
	// **Kamera zurücksetzen**
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

// Event Listener für Mausbewegung und Klick
window.addEventListener('mousemove', onMouseMove, false);
renderer.domElement.addEventListener('click', onClick, false);
		
// Animationsfunktion
function animate() {
    requestAnimationFrame(animate);
            
    // Nur rotieren, wenn isRotating true ist
	if (isRotating) {
		letter.rotation.y += 0.005; // Kontinuierliche Rotation
		if (heartParticles) {
			heartParticles.rotation.y += 0.005;
		}
	}

    composer.render();
}
        
animate();

// Fenstergröße anpassen
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
			
	// Shader-Auflösung anpassen
	composer.setSize(window.innerWidth, window.innerHeight);
	zoomLetter();
});