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

    toString() {
        return "#" + this.red.toString(16) + this.green.toString(16) + this.blue.toString(16);
    }

    style() { 
        return `
            border: 1x solid black;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: ${this.toString()};
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

    constructor(LStar, aStar, bStar) {
        this.LStar = LStar;
        this.aStar = aStar;
        this.bStar = bStar;
    }

    static fromRGBPixel(rgbPixel) {
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

        return new CIELABPixel(116 * fOfYOverYn - 16, 500 * (CIELABPixel.#f(x / xN) - fOfYOverYn), 200 * (fOfYOverYn - CIELABPixel.#f(z / zN)));
    }

    // Returns the distance to another CIELABPixel squared
    distance(other) {
        return Math.pow(other.LStar - this.LStar, 2) + Math.pow(other.aStar - this.aStar, 2) + Math.pow(other.bStar - this.bStar, 2);
    }
}

class CIELABPixelRef {
    constructor(pixel, row, col) {
        this.pixel = pixel;
        this.row = row;
        this.col = col;
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
    static fromImageData(imageData, width, height) {
        let rgbPixels = [];
        let k = 0;
        for (let i = 0; i < height; ++i) {
            let row = [];
            for (let j = 0; j < width; ++j) {
                row.push(new RGBPixel(imageData[k], imageData[k+1], imageData[k+2]));
                k += 4;
            }
            rgbPixels.push(row);
        }
        return new PixelImage(rgbPixels, width, height);
    }

    constructor(rgbPixels, width, height) {
        this.width = width;
        this.height = height;
        this.pixels = rgbPixels;
    }

    // Returns the html representation of the grid
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

    // The current picrossification algorithm reduces of the image using nearest neighbor,
    // then splits up the corresponding color into "buckets" of supposedly similar colors.
    // An improvement would be to use an algorithm that makes the color categories dependent
    // on the album's color palette instead of assuming a universal color palette.
    // The function modifes the underlying data of the image to be the picrossified version
    // and returns the array of colors representing the palette used in the result.
    picrossify(newWidth, newHeight) {
        let newPixels = [];
        const rowOffset = this.height / (2 * newHeight);
        const colOffset = this.width / (2 * newWidth);
        for (let i = 0; i < newHeight; ++i) {
            let newRow = [];
            for (let j = 0; j < newWidth; ++j) {
                const yPos = Math.round(rowOffset + i * this.height / newHeight);
                const xPos = Math.round(colOffset + j * this.width / newWidth);
                newRow.push(CIELABPixel.fromRGBPixel(this.pixels[yPos][xPos]));
            }
            newPixels.push(newRow);
        }

        let blackPixels = [];
        let grayPixels = [];
        let whitePixels = [];
        let brownPixels = [];
        let darkRedPixels = [];
        let darkPurplePixels = [];
        let darkAquaPixels = [];
        let lightGreenPixels = [];
        let darkGreenPixels = [];
        let redPixels = [];
        let pinkPixels = [];
        let orangePixels = [];
        let yellowPixels = [];
        let cyanPixels = [];
        let darkBluePixels = [];

        let colorBuckets = [
            blackPixels,
            grayPixels,
            whitePixels,
            brownPixels,
            darkRedPixels,
            darkPurplePixels,
            darkAquaPixels,
            lightGreenPixels,
            darkGreenPixels,
            redPixels,
            pinkPixels,
            orangePixels,
            yellowPixels,
            cyanPixels,
            darkBluePixels,
        ];

        for (let i = 0; i < newHeight; ++i) {
            for (let j = 0; j < newWidth; ++j) {
                const aStar = newPixels[i][j].aStar;
                const bStar = newPixels[i][j].bStar;
                const LStar = newPixels[i][j].LStar;
                const angle = Math.atan2(bStar, aStar);
                
                if (-20 <= aStar && aStar <= 20 && -20 <= bStar && bStar <= 20) {
                    if (LStar < 20) {
                        blackPixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    } else if (LStar > 80) {
                        whitePixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    } else {
                        grayPixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    }
                } else if (LStar < 50) {
                    if (angle < -3 * Math.PI / 4 || angle > 3 * Math.PI / 4) {
                        darkGreenPixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    } else if (-3 * Math.PI / 4 <= angle && angle < -Math.PI / 4) {
                        brownPixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    } else if (-Math.PI / 4 <= angle && angle < Math.PI / 4) {
                        darkRedPixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    } else if (Math.PI / 4 <= angle && angle < 4 * Math.PI / 7) {
                        darkPurplePixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    } else if (4 * Math.PI / 7 <= angle && angle < 3 * Math.PI / 5) {
                        darkBluePixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    } else if (3 * Math.PI / 5 <= angle) {
                        darkAquaPixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    }
                } else {
                    if (angle < -3 * Math.PI / 5 || angle >= 3 * Math.PI / 4) {
                        lightGreenPixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    } else if (-3 * Math.PI / 5 <= angle && angle < -3 * Math.PI / 7) {
                        yellowPixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    } else if (-3 * Math.PI / 7 <= angle && angle < 3 * Math.PI / 10) {
                        orangePixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    } else if (3 * Math.PI / 10 <= angle && angle < Math.PI / 8) {
                        redPixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    } else if (Math.PI / 8 <= angle && angle < 2 * Math.PI / 5) {
                        pinkPixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    } else if (2 * Math.PI / 5 <= angle && angle < 3 * Math.PI / 4) {
                        cyanPixels.push(new CIELABPixelRef(newPixels[i][j], i, j));
                    }
                }
            }
        }
        let palette = [];
        for (let i = 0; i < colorBuckets.length; ++i) {
            const bucket = colorBuckets[i];
            if (bucket.length > 0) {
                let LStar = 0;
                let aStar = 0;
                let bStar = 0;
                for (let i = 0; i < bucket.length; ++i) {
                    const pixelRef = bucket[i];
                    LStar += pixelRef.pixel.LStar;
                    aStar += pixelRef.pixel.aStar;
                    bStar += pixelRef.pixel.bStar;
                }
                const avgPixel = new CIELABPixel(LStar / bucket.length, aStar / bucket.length, bStar / bucket.length);
                for (let i = 0; i < bucket.length; ++i) {
                    const pixelRef = bucket[i];
                    newPixels[pixelRef.row][pixelRef.col] = avgPixel;
                }
                palette.push(RGBPixel.fromCIELABPixel(avgPixel).toString());
            }
        }
        this.pixels = newPixels.map((row) => row.map((cielabPixel) => RGBPixel.fromCIELABPixel(cielabPixel)));
        this.height = newHeight;
        this.width = newWidth;
        return palette;
    }
}