import { createApp, reactive, ref } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { Renderer } from './renderer.js';

let app = createApp({
    setup() {
        return {
            view: {
                id: 'view',
                width: 800,
                height: 600
            },
            renderer: ref({})
        }
    },
    
    methods: {
        loadNewScene() {
            let scene_file = document.getElementById('scene_file');

            let reader = new FileReader();
            reader.onload = (event) => {
                let scene = JSON.parse(event.target.result);
                this.renderer.updateScene(scene);
            };
            reader.readAsText(scene_file.files[0], 'UTF-8');
        },

        onKeyDown(event) {
            switch (event.keyCode) {
                case 37: // LEFT Arrow
                    this.renderer.rotateLeft();
                    break;
                case 39: // RIGHT Arrow
                    this.renderer.rotateRight();
                    break;
                case 65: // A key
                    this.renderer.moveLeft();
                    break;
                case 68: // D key
                    this.renderer.moveRight();
                    break;
                case 83: // S key
                    this.renderer.moveBackward();
                    break;
                case 87: // W key
                    this.renderer.moveForward();
                    break;
            }
        }
    }
}).mount('#content');

let initial_scene = {
    view: {
        "prp": [0, 4, 15],
        "srp": [0, 0, 0],
        "vup": [0, 1, 0],
        clip: [-2, 2, -2, 2, 1, 100]
    },
    models: [
        {
            "type": "cylinder",
            "center": [0, -3, 0],
            "radius": 0.5,
            "height": 1.5,
            "sides": 8
        },
        {
            "type": "cone",
            "center": [0, -1.5, 0],
            "radius": 2,
            "height": 2.5,
            "sides": 10
        },
        {
            "type": "cone",
            "center": [0, 0.5, 0],
            "radius": 1.5,
            "height": 2,
            "sides": 10
        },
        {
            "type": "cone",
            "center": [0, 2.2, 0],
            "radius": 1,
            "height": 1.5,
            "sides": 10
        },
        {
            "type": "cube",
            "center": [-3, -2.5, 0],
            "width": 1.5,
            "depth": 1.5,
            "height": 1.5,
            "animation": {
                "axis": "y",
                "rps": 0.4
            }
        }
    ]
};

document.addEventListener('keydown', app.onKeyDown, false);
    
app.renderer = new Renderer(app.view, initial_scene);
window.requestAnimationFrame((timestamp) => {
    app.renderer.animate(timestamp);
});
