import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'dat.gui';
import { db, doc, setDoc, getDoc } from './firebase.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color('black');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 80, 150);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 20;
controls.maxDistance = 500;

function addStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.7,
        transparent: true
    });
    
    const starsVertices = [];
    for (let i = 0; i < 5000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}
addStars();

const ambientLight = new THREE.AmbientLight(0x555555);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xffffff, 2, 1500);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const textureLoader = new THREE.TextureLoader();
const sunTexture = textureLoader.load(
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/examples/textures/lava/cloud.png',
    () => console.log("Sun texture loaded"),  
    undefined, 
    (err) => console.error("Error loading sun texture", err) // Error callback
);

const sunMaterial = new THREE.MeshStandardMaterial({
    color: 0xffdd00,
    emissive: 0xffaa00, 
    emissiveIntensity: 1.5,
    map: sunTexture
});

const sunGeometry = new THREE.SphereGeometry(8, 64, 64);
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

const sunGlowTexture = textureLoader.load(
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/examples/textures/sprites/disc.png',
    () => console.log("Sun glow texture loaded"),
    undefined,
    (err) => console.error("Error loading sun glow texture", err)
);

const sunGlowMaterial = new THREE.SpriteMaterial({ 
    map: sunGlowTexture,
    color: 0xffee88,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
});
const sunGlow = new THREE.Sprite(sunGlowMaterial);
sunGlow.scale.set(40, 40, 2); 
sun.add(sunGlow);

renderer.setClearColor(0x000000, 0);  

const planetData = [
    { name: 'Mercury', size: 1.5, distance: 20, speed: 0.008, color: 0xFFFFFF, info: "Smallest planet, closest to the Sun" },
    { name: 'Venus', size: 3.0, distance: 30, speed: 0.006, color: 0xFFAA33, info: "Hottest planet due to runaway greenhouse effect" },
    { name: 'Earth', size: 3.5, distance: 40, speed: 0.005, color: 0x0099FF, info: "Our home planet, the only known planet with life" },
    { name: 'Mars', size: 2.5, distance: 55, speed: 0.004, color: 0xFF3300, info: "The Red Planet, has the largest volcano in the solar system" },
    { name: 'Jupiter', size: 8.0, distance: 100, speed: 0.002, color: 0xFFFF00, info: "Largest planet, more than twice the mass of all other planets combined" },
    { name: 'Saturn', size: 7.0, distance: 140, speed: 0.0015, color: 0xFFDD44, info: "Known for its spectacular ring system" },
    { name: 'Uranus', size: 5.5, distance: 180, speed: 0.001, color: 0x33CCFF, info: "Ice giant with a tilted rotation axis" },
    { name: 'Neptune', size: 5.0, distance: 220, speed: 0.0008, color: 0x3366FF, info: "Windiest planet with the strongest winds in the solar system" },
];

const planets = [];
const orbitLines = [];
let orbitsVisible = true;
let selectedPlanet = null;

planetData.forEach(data => {
    const geometry = new THREE.SphereGeometry(data.size, 32, 32);
    const material = new THREE.MeshPhongMaterial({ 
        color: data.color,
        shininess: 25,
    });
    
    const planet = new THREE.Mesh(geometry, material);
    planet.castShadow = true;
    planet.receiveShadow = true;
    planet.userData = { info: data.info, name: data.name };
    
    const orbit = new THREE.Group();
    scene.add(orbit);
    orbit.add(planet);
    
    planet.position.x = data.distance;
    
    const orbitGeometry = new THREE.RingGeometry(data.distance - 0.2, data.distance + 0.2, 128);
const orbitMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffffff, 
    transparent: true,
    opacity: 0.5, 
    side: THREE.DoubleSide 
});
const orbitLine = new THREE.Mesh(orbitGeometry, orbitMaterial);
orbitLine.rotation.x = Math.PI / 2;
scene.add(orbitLine);
orbitLines.push(orbitLine);
    
    if (data.name === 'Saturn') {
        const ringGeometry = new THREE.RingGeometry(data.size * 1.4, data.size * 2.5, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xCDAB84,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 3;
        planet.add(ring);
    }
   
    planets.push({ 
        ...data, 
        mesh: planet, 
        orbit: orbit 
    });
});

const infoPanel = document.createElement('div');
infoPanel.id = 'info-panel';
infoPanel.innerHTML = `
    <h3>Planet Information</h3>
    <div id="planet-info">Select a planet to view details</div>
`;
document.body.appendChild(infoPanel);

const loadingIndicator = document.createElement('div');
loadingIndicator.id = 'loading-indicator';
loadingIndicator.innerHTML = `
    <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
    <span id="loading-text">Loading configuration...</span>
`;
document.body.appendChild(loadingIndicator);

const gui = new GUI({ width: 300 });
gui.domElement.id = 'gui';
document.getElementById('controls')?.appendChild(gui.domElement);

if (!document.getElementById('controls')) {
    const controls = document.createElement('div');
    controls.id = 'controls';
    
    const appHeader = document.createElement('div');
    appHeader.id = 'app-header';
    appHeader.innerHTML = '<h2 id="app-title">Solar System</h2>';
    controls.appendChild(appHeader);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'button-container';
    controls.appendChild(buttonContainer);
    
    if (!document.getElementById('save')) {
        const saveButton = document.createElement('button');
        saveButton.id = 'save';
        saveButton.textContent = 'Save Config';
        buttonContainer.appendChild(saveButton);
    }
    
    if (!document.getElementById('load')) {
        const loadButton = document.createElement('button');
        loadButton.id = 'load';
        loadButton.textContent = 'Load Config';
        buttonContainer.appendChild(loadButton);
    }
    
    const viewControls = document.createElement('div');
    viewControls.id = 'view-controls';
    
    // const resetViewButton = document.createElement('button');
    // resetViewButton.id = 'reset-view';
    // // resetViewButton.textContent = 'Reset Camera';
    // resetViewButton.className = 'full-width';
    // viewControls.appendChild(resetViewButton);
    
    const toggleOrbitsButton = document.createElement('button');
    toggleOrbitsButton.id = 'toggle-orbits';
    toggleOrbitsButton.textContent = 'Toggle Orbit Paths';
    toggleOrbitsButton.className = 'full-width';
    viewControls.appendChild(toggleOrbitsButton);
    
    controls.appendChild(viewControls);
    document.body.appendChild(controls);
}

const globalFolder = gui.addFolder('Global Settings');
const globalSettings = {
    simulationSpeed: 1,
    sunIntensity: 1.5
};

globalFolder.add(globalSettings, 'simulationSpeed', 0.1, 5).name('Simulation Speed').onChange(value => {
    planets.forEach(planet => {
        planet.speed = planet.speed * value / globalSettings.simulationSpeed;
    });
});

globalFolder.add(globalSettings, 'sunIntensity', 0.5, 3).name('Sun Intensity').onChange(value => {
    sunLight.intensity = value;
});

planets.forEach(planet => {
    const folder = gui.addFolder(planet.name);
    folder.add(planet.mesh.scale, 'x', 0.1, 5).name('Size').onChange(value => {
        planet.mesh.scale.set(value, value, value);
    });
    folder.add(planet, 'speed', 0.0001, 0.01).name('Orbit Speed');
    folder.add(planet.mesh.position, 'x', 10, 300).name('Orbit Distance');
   
    folder.add({
        focus: function() {
            selectedPlanet = planet;
            document.getElementById('planet-info').textContent = 
                `${planet.name}: ${planet.userData?.info || 'No information available'}`;
        }
    }, 'focus').name('Focus on Planet');
});

document.getElementById('reset-view')?.addEventListener('click', () => {
    camera.position.set(0, 80, 150);
    controls.target.set(0, 0, 0);
});

document.getElementById('toggle-orbits')?.addEventListener('click', () => {
    orbitsVisible = !orbitsVisible;
    orbitLines.forEach(line => {
        line.visible = orbitsVisible;
    });
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event) => {
  
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    const planetMeshes = planets.map(p => p.mesh);
    const intersects = raycaster.intersectObjects(planetMeshes);
    
    if (intersects.length > 0) {
        const clickedPlanet = planets.find(p => p.mesh === intersects[0].object);
        if (clickedPlanet) {
            selectedPlanet = clickedPlanet;
            document.getElementById('planet-info').textContent = 
                `${clickedPlanet.name}: ${clickedPlanet.userData?.info || 'No information available'}`;
        }
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    sun.rotation.y += 0.001;
    
    planets.forEach(planet => {
        planet.orbit.rotation.y += planet.speed * globalSettings.simulationSpeed;
    });
    
    controls.update();
    
    if (selectedPlanet) {
        
        const worldPos = new THREE.Vector3();
        selectedPlanet.mesh.getWorldPosition(worldPos);
        
        controls.target.lerp(worldPos, 0.05);
    }
    
    renderer.render(scene, camera);
}

async function saveConfig() {
    showLoading(true, 'Saving configuration...');
    
    try {
        const config = planets.map(planet => ({
            name: planet.name,
            size: planet.mesh.scale.x,
            speed: planet.speed / globalSettings.simulationSpeed, // Save base speed
            distance: planet.mesh.position.x,
        }));
        
        await setDoc(doc(db, 'configs', 'userConfig'), { 
            config,
            globalSettings,
            savedAt: new Date().toISOString()
        });
        
        showNotification('Configuration saved successfully!');
    } catch (error) {
        showNotification('Error saving configuration: ' + error.message, true);
    } finally {
        showLoading(false);
    }
}

async function loadConfig() {
    showLoading(true, 'Loading configuration...');
    
    try {
        const docRef = doc(db, 'configs', 'userConfig');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            if (data.globalSettings) {
                globalSettings.simulationSpeed = data.globalSettings.simulationSpeed;
                globalSettings.sunIntensity = data.globalSettings.sunIntensity;
                sunLight.intensity = data.globalSettings.sunIntensity;
                
                // Update GUI controllers
                for (const controller of globalFolder.controllers) {
                    controller.updateDisplay();
                }
            }
            
            if (data.config && Array.isArray(data.config)) {
                data.config.forEach(planetConfig => {
                    const planet = planets.find(p => p.name === planetConfig.name);
                    if (planet) {
                    
                        planet.mesh.scale.set(planetConfig.size, planetConfig.size, planetConfig.size);
                        planet.speed = planetConfig.speed * globalSettings.simulationSpeed;
                        planet.mesh.position.x = planetConfig.distance;
                        
                        const index = planets.indexOf(planet);
                        if (index >= 0 && index < orbitLines.length) {
                            scene.remove(orbitLines[index]);
                            
                            const orbitGeometry = new THREE.RingGeometry(planetConfig.distance - 0.1, planetConfig.distance + 0.1, 128);
                            const orbitMaterial = new THREE.MeshBasicMaterial({ 
                                color: 0xffffff, 
                                transparent: true,
                                opacity: 0.15,
                                side: THREE.DoubleSide 
                            });
                            const orbitLine = new THREE.Mesh(orbitGeometry, orbitMaterial);
                            orbitLine.rotation.x = Math.PI / 2;
                            orbitLine.visible = orbitsVisible;
                            scene.add(orbitLine);
                            orbitLines[index] = orbitLine;
                        }
                        
                        for (const folder of gui.folders) {
                            if (folder.name === planet.name) {
                                for (const controller of folder.controllers) {
                                    controller.updateDisplay();
                                }
                            }
                        }
                    }
                });
            }
            
            showNotification('Configuration loaded successfully!');
        } else {
            showNotification('No saved configuration found', true);
        }
    } catch (error) {
        showNotification('Error loading configuration: ' + error.message, true);
    } finally {
        showLoading(false);
    }
}

function showLoading(show, message = 'Loading...') {
    const loadingElement = document.getElementById('loading-indicator');
    const loadingText = document.getElementById('loading-text');
    
    if (show) {
        loadingElement.style.display = 'flex';
        if (loadingText) loadingText.textContent = message;
    } else {
        loadingElement.style.display = 'none';
    }
}

function showNotification(message, isError = false) {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = isError ? 'error' : 'success';
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

document.getElementById('save')?.addEventListener('click', saveConfig);
document.getElementById('load')?.addEventListener('click', loadConfig);

animate();