/*
Purpose:
    Read and hold the application config
*/

import * as THREE from 'three';

export class AppConfig {
    constructor() {
        this.loader = new THREE.FileLoader();
        this.loader.setResponseType('json');
        this.data = null;
        this.isLoaded = false;
    }

    load(onLoad) {
        this.loader.load(
            './AppConfig.json',
            (data) => {
                this.data = data;
                this.isLoaded = true;
                if (onLoad) {
                    onLoad();
                }
            },
            function (xhr) {
                console.log( ('AppConfig loading:' + xhr.loaded / xhr.total * 100) + '% loaded' );
            },
            function (err) {
                console.error(err);
                alert("Unable to read application configuration: " + err);
            }

        );
    }

    reload(onLoad) {
        this.data = null;
        this.isLoaded = false;
        this.load(onLoad);
    }


}