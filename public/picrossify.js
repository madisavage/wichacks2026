class RGBPixel {
    constructor(red, blue, green) {
        this.red = red;
        this.blue = blue;
        this.green = green;
    }

    style() { 
        return `
            border: 0x solid black;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #${this.red.toString(16) + this.blue.toString(16) + this.green.toString(16)}
        `;
    }

    toHtml() {
        return `<div style="${this.style()}"></div>`;
    }
}

class HSVPixel {
    constructor(hue, saturation, value) {
        this.hue = hue;
        this.saturation = saturation;
        this.value = value;
    }
}

class PixelImage {
    style = `
        display: grid;
        grid-template-columns: repeat(640, 1fr);
        grid-template-rows: repeat(640, 1fr);
        height: 1000px;width: 1000px;
        padding: 10px;
    `;

    // Creates an image from an ImageData
    constructor(imageData, width, height) {
        this.width = width;
        this.height = height;
        this.pixels = [];
        let k = 0;
        for (let i = 0; i < height; ++i) {
            let row = [];
            for (let j = 0; j < width; ++j) {
                row.push(new RGBPixel(imageData[k], imageData[k+1], imageData[k+2]));
                k += 4;
            }
            this.pixels.push(row);
        }
    }

    toHtml() {
        let result = `<div class="picross-grid" style="${this.style()}">`;
        for (let i = 0; i < this.height; ++i) {
            for (let j = 0; j < this.width; ++j) {
                result += this.pixels[i][j].toHtml();
            }
        }
        result += `</div>`;
        return result;
    }

    picrossify(width, height) {

    }
}


