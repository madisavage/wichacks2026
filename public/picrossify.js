class RGBPixel {
    constructor(red, green, blue) {
        this.red = red;
        this.green = green;
        this.blue = blue;
    }

    static #fInverse(t) {
        return t > 0.206893 ? Math.pow(t, 3) : (t - 16/116) / 7.787;
    }

    static fromCIELABPixel(cielabPixel) {
        const fOfYOverYn = (cielabPixel.LStar + 16) / 116;
        const fOfXOverXn = (cielabPixel.aStar / 500) + fOfYOverYn;
        const fOfZOverZn = fOfYOverYn - (cielabPixel.bStar / 200);

        const xN = 0.95047;
        const yN = 1.00000;
        const zN = 1.08883;

        const x = xN * RGBPixel.#fInverse(fOfXOverXn);
        const y = yN * RGBPixel.#fInverse(fOfYOverYn);
        const z = zN * RGBPixel.#fInverse(fOfZOverZn);

        const rLinear = 3.24045 * x - 1.53714 * y - 0.498532 * z;
        const gLinear = -0.969266 * x + 1.87601 * y + 0.0415561 * z;
        const bLinear = 0.0556434 * x - 0.204026 * y + 1.05723 * z;

        const rPrime = rLinear < 0.003130806 ? 12.92 * rLinear : 1.055 * Math.pow(rLinear, 1/2.4) - 0.055;
        const gPrime = gLinear < 0.003130806 ? 12.92 * gLinear : 1.055 * Math.pow(gLinear, 1/2.4) - 0.055;
        const bPrime = bLinear < 0.003130806 ? 12.92 * bLinear : 1.055 * Math.pow(bLinear, 1/2.4) - 0.055;

        return new RGBPixel(Math.max(0, Math.min(Math.round(rPrime * 255), 255)), Math.max(0, Math.min(Math.round(gPrime * 255), 255)), Math.max(0, Math.min(Math.round(bPrime * 255), 255)));
    }

    style() { 
        return `
            border: 1x solid black;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #${this.red.toString(16) + this.green.toString(16) + this.blue.toString(16)};
        `;
    }

    toHtml() {
        return `<div style="${this.style()}"></div>`;
    }
}

class CIELABPixel {
    static #f(t) {
        return t > 0.008856 ? Math.pow(t, 1/3) : (7.787 * t) + 16/116;
    }

    constructor(rgbPixel) {
        // Normalize RGB values
        const redPrime = rgbPixel.red / 255;
        const greenPrime = rgbPixel.green / 255;
        const bluePrime = rgbPixel.blue / 255;

        // Apply gamma correction
        const redLinear = (redPrime > 0.04045) ? Math.pow((redPrime + 0.055) / 1.055, 2.4) : redPrime / 12.92;
        const greenLinear = (greenPrime > 0.04045) ? Math.pow((greenPrime + 0.055) / 1.055, 2.4) : greenPrime / 12.92;
        const blueLinear = (bluePrime > 0.04045) ? Math.pow((bluePrime + 0.055) / 1.055, 2.4) : bluePrime / 12.92;

        // Convert to XYZ color space
        const x = 0.4124564 * redLinear + 0.3575761 * greenLinear + 0.1804375 * blueLinear;
        const y = 0.2126729 * redLinear + 0.7151522 * greenLinear + 0.0721750 * blueLinear;
        const z = 0.0193339 * redLinear + 0.1191920 * greenLinear + 0.9503041 * blueLinear;

        // Using reference white point for D65 illuminant
        const xN = 0.95047;
        const yN = 1.00000;
        const zN = 1.08883;

        const fOfYOverYn = CIELABPixel.#f(y / yN);

        // Black = 0, White = 100
        this.LStar = 116 * fOfYOverYn - 16;

        // Negative values go towards green, positive values go towards red
        this.aStar = 500 * (CIELABPixel.#f(x / xN) - fOfYOverYn);

        // Negative values go towards blue, positive values go towards yellow
        this.bStar = 200 * (fOfYOverYn - CIELABPixel.#f(z / zN));
    }

    // Returns the distance to another CIELABPixel squared
    distance(other) {
        return Math.pow(other.LStar - this.LStar, 2) + Math.pow(other.aStar - this.aStar, 2) + Math.pow(other.bStar - this.bStar, 2);
    }
}

class PixelImage {
    style() {
        return `
            display: grid;
            grid-template-columns: repeat(${this.width}, 1fr);
            grid-template-rows: repeat(${this.height}, 1fr);
            height: 600px;width: 600px;
            padding: 10px;
        `;
    }

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

    picrossify(newWidth, newHeight, takeTheAverage) {
        let newPixels = [];
        const rowOffset = this.height / (2 * newHeight);
        const colOffset = this.width / (2 * newWidth);
        for (let i = 0; i < newHeight; ++i) {
            let newRow = [];
            for (let j = 0; j < newWidth; ++j) {
                const yPos = Math.round(rowOffset + i * this.height / newHeight);
                const xPos = Math.round(colOffset + j * this.width / newWidth);
                newRow.push(RGBPixel.fromCIELABPixel(new CIELABPixel(this.pixels[yPos][xPos])));
            }
            newPixels.push(newRow);
        }

        this.pixels = newPixels;
        this.width = newWidth;
        this.height = newHeight;
    }
}


